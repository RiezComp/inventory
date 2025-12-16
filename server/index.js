const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { authMiddleware, adminOnly, JWT_SECRET } = require('./authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// ==================== AUTH ENDPOINTS ====================

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get('SELECT * FROM users WHERE username = ? AND is_active = 1', [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isValidPassword = bcrypt.compareSync(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    });
});

// Get current user info
app.get('/api/auth/me', authMiddleware, (req, res) => {
    db.get('SELECT id, username, full_name, role FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    });
});

// ==================== USER MANAGEMENT (Admin Only) ====================

// Get all users
app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
    db.all('SELECT id, username, full_name, role, created_at, is_active FROM users ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

// Create new user
app.post('/api/users', authMiddleware, adminOnly, (req, res) => {
    const { username, password, full_name, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    db.run(
        'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, full_name || '', role || 'user'],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'User created', userId: this.lastID });
        }
    );
});

// Update user
app.put('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
    const { id } = req.params;
    const { full_name, role, is_active, password } = req.body;

    let sql = 'UPDATE users SET full_name = ?, role = ?, is_active = ?';
    let params = [full_name, role, is_active ? 1 : 0];

    if (password) {
        sql += ', password = ?';
        params.push(bcrypt.hashSync(password, 10));
    }

    sql += ' WHERE id = ?';
    params.push(id);

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User updated' });
    });
});

// Delete user
app.delete('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
    const { id } = req.params;

    if (parseInt(id) === 1) {
        return res.status(400).json({ error: 'Cannot delete default admin' });
    }

    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User deleted' });
    });
});

// ==================== INVENTORY ENDPOINTS (Protected) ====================

// Get all inventory items
app.get('/api/inventory', authMiddleware, (req, res) => {
    const sql = 'SELECT * FROM items ORDER BY name ASC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'success', data: rows });
    });
});

// Add stock (IN) - Create item if not exists or update qty. Handles Image Upload.
app.post('/api/inventory/in', authMiddleware, upload.single('image'), (req, res) => {
    const { name, part_number, category, footprint, qty, location, project_ref, notes, datasheet_url } = req.body;
    const image_path = req.file ? `/uploads/${req.file.filename}` : null;
    const user_id = req.user.id;

    if (!name || !qty) {
        return res.status(400).json({ error: 'Name and Qty are required' });
    }

    // Check if item exists
    db.get('SELECT * FROM items WHERE name = ?', [name], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        const timestamp = new Date().toISOString();
        const quantity = parseInt(qty);

        if (row) {
            // Update existing item
            let sql = 'UPDATE items SET total_qty = ?, location = COALESCE(?, location)';
            let params = [row.total_qty + quantity, location];

            if (image_path) {
                sql += ', image_path = ?';
                params.push(image_path);
            }

            if (part_number) {
                sql += ', part_number = ?';
                params.push(part_number);
            }
            if (footprint) {
                sql += ', footprint = ?';
                params.push(footprint);
            }
            if (datasheet_url) {
                sql += ', datasheet_url = ?';
                params.push(datasheet_url);
            }

            sql += ' WHERE id = ?';
            params.push(row.id);

            db.run(sql, params, function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // Log transaction with user_id
                db.run('INSERT INTO transactions (item_id, user_id, type, qty, project_ref, timestamp, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [row.id, user_id, 'IN', quantity, project_ref, timestamp, notes]);

                res.json({ message: 'Stock updated', itemId: row.id, newQty: row.total_qty + quantity });
            });
        } else {
            // Create new item
            db.run('INSERT INTO items (name, part_number, category, footprint, total_qty, location, notes, image_path, datasheet_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [name, part_number, category, footprint, quantity, location, notes, image_path, datasheet_url],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    const newItemId = this.lastID;

                    // Log transaction with user_id
                    db.run('INSERT INTO transactions (item_id, user_id, type, qty, project_ref, timestamp, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [newItemId, user_id, 'IN', quantity, project_ref, timestamp, notes]);

                    res.json({ message: 'Item created', itemId: newItemId, total_qty: quantity });
                }
            );
        }
    });
});

// Use stock (OUT)
app.post('/api/inventory/out', authMiddleware, (req, res) => {
    const { item_id, qty, project_ref, notes } = req.body;
    const user_id = req.user.id;

    if (!item_id || !qty) {
        return res.status(400).json({ error: 'Item ID and Qty are required' });
    }

    db.get('SELECT * FROM items WHERE id = ?', [item_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Item not found' });

        const quantity = parseInt(qty);
        if (row.total_qty < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        const newQty = row.total_qty - quantity;
        const timestamp = new Date().toISOString();

        db.run('UPDATE items SET total_qty = ? WHERE id = ?', [newQty, item_id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Log transaction with user_id
            db.run('INSERT INTO transactions (item_id, user_id, type, qty, project_ref, timestamp, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [item_id, user_id, 'OUT', quantity, project_ref, timestamp, notes]);

            res.json({ message: 'Stock used', itemId: item_id, newQty });
        });
    });
});

// Delete inventory item
app.delete('/api/inventory/:id', authMiddleware, (req, res) => {
    const { id } = req.params;

    // Delete transactions first (referential integrity usually handled by DB, but good to be explicit or safe)
    db.run('DELETE FROM transactions WHERE item_id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.run('DELETE FROM service_parts_used WHERE item_id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Delete item
            db.run('DELETE FROM items WHERE id = ?', [id], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Item deleted' });
            });
        });
    });
});

// Get transaction history with username
app.get('/api/history', authMiddleware, (req, res) => {
    const sql = `
    SELECT t.*, i.name as item_name, u.username, u.full_name
    FROM transactions t 
    JOIN items i ON t.item_id = i.id 
    LEFT JOIN users u ON t.user_id = u.id
    ORDER BY t.timestamp DESC
  `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'success', data: rows });
    });
});

// ==================== SERVICE MANAGEMENT ENDPOINTS ====================

// Get all service orders with filters
app.get('/api/service', authMiddleware, (req, res) => {
    const { status, priority, overdue } = req.query;

    let sql = `
        SELECT s.*, u.username as technician_name, c.username as created_by_name
        FROM service_orders s
        LEFT JOIN users u ON s.technician_id = u.id
        LEFT JOIN users c ON s.created_by = c.id
        WHERE 1=1
    `;
    const params = [];

    if (status) {
        sql += ' AND s.status = ?';
        params.push(status);
    }
    if (priority) {
        sql += ' AND s.priority = ?';
        params.push(priority);
    }
    if (overdue === 'true') {
        sql += " AND s.due_date < datetime('now') AND s.status NOT IN ('completed', 'delivered')";
    }

    sql += ' ORDER BY s.date_received DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

// Get single service order with parts
app.get('/api/service/:id', authMiddleware, (req, res) => {
    const { id } = req.params;

    db.get(`
        SELECT s.*, u.username as technician_name, c.username as created_by_name
        FROM service_orders s
        LEFT JOIN users u ON s.technician_id = u.id
        LEFT JOIN users c ON s.created_by = c.id
        WHERE s.id = ?
    `, [id], (err, service) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!service) return res.status(404).json({ error: 'Service order not found' });

        // Get parts used
        db.all(`
            SELECT sp.*, i.name as item_name, i.part_number
            FROM service_parts_used sp
            JOIN items i ON sp.item_id = i.id
            WHERE sp.service_order_id = ?
            ORDER BY sp.timestamp DESC
        `, [id], (err, parts) => {
            if (err) return res.status(500).json({ error: err.message });
            service.parts_used = parts || [];
            res.json({ message: 'success', data: service });
        });
    });
});

// Create new service order
app.post('/api/service', authMiddleware, (req, res) => {
    const {
        item_name, serial_number, customer_name, customer_contact,
        complaint, diagnosis, actions_taken, status, priority,
        due_date, technician_id, cost_estimate, notes
    } = req.body;
    const created_by = req.user.id;

    if (!item_name || !customer_name || !complaint) {
        return res.status(400).json({ error: 'Item name, customer name, and complaint are required' });
    }

    db.run(`
        INSERT INTO service_orders (
            item_name, serial_number, customer_name, customer_contact,
            complaint, diagnosis, actions_taken, status, priority,
            due_date, technician_id, cost_estimate, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        item_name, serial_number, customer_name, customer_contact,
        complaint, diagnosis, actions_taken, status || 'pending', priority || 'medium',
        due_date, technician_id, cost_estimate, notes, created_by
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Service order created', serviceId: this.lastID });
    });
});

// Update service order
app.put('/api/service/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const {
        item_name, serial_number, customer_name, customer_contact,
        complaint, diagnosis, actions_taken, status, priority,
        due_date, completed_date, technician_id, cost_estimate, notes
    } = req.body;

    db.run(`
        UPDATE service_orders SET
            item_name = ?, serial_number = ?, customer_name = ?, customer_contact = ?,
            complaint = ?, diagnosis = ?, actions_taken = ?, status = ?, priority = ?,
            due_date = ?, completed_date = ?, technician_id = ?, cost_estimate = ?, notes = ?
        WHERE id = ?
    `, [
        item_name, serial_number, customer_name, customer_contact,
        complaint, diagnosis, actions_taken, status, priority,
        due_date, completed_date, technician_id, cost_estimate, notes, id
    ], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Service order updated' });
    });
});

// Delete service order
app.delete('/api/service/:id', authMiddleware, (req, res) => {
    const { id } = req.params;

    // Delete parts used first
    db.run('DELETE FROM service_parts_used WHERE service_order_id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Delete service order
        db.run('DELETE FROM service_orders WHERE id = ?', [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Service order deleted' });
        });
    });
});

// Add parts to service order (auto deduct from inventory)
app.post('/api/service/:id/parts', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { item_id, qty } = req.body;
    const user_id = req.user.id;

    if (!item_id || !qty) {
        return res.status(400).json({ error: 'Item ID and quantity required' });
    }

    // Check inventory
    db.get('SELECT * FROM items WHERE id = ?', [item_id], (err, item) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!item) return res.status(404).json({ error: 'Item not found' });
        if (item.total_qty < qty) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }

        const timestamp = new Date().toISOString();

        // Deduct from inventory
        db.run('UPDATE items SET total_qty = total_qty - ? WHERE id = ?', [qty, item_id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Add to service parts
            db.run(
                'INSERT INTO service_parts_used (service_order_id, item_id, qty) VALUES (?, ?, ?)',
                [id, item_id, qty],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });

                    // Log transaction
                    db.run(
                        'INSERT INTO transactions (item_id, user_id, type, qty, project_ref, timestamp, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [item_id, user_id, 'OUT', qty, `Service Order #${id}`, timestamp, 'Used for service/repair'],
                        (err) => {
                            if (err) console.error('Error logging transaction:', err.message);
                            res.json({ message: 'Parts added to service order', newStock: item.total_qty - qty });
                        }
                    );
                }
            );
        });
    });
});

// Get parts used for service order
app.get('/api/service/:id/parts', authMiddleware, (req, res) => {
    const { id } = req.params;

    db.all(`
        SELECT sp.*, i.name as item_name, i.part_number, i.category
        FROM service_parts_used sp
        JOIN items i ON sp.item_id = i.id
        WHERE sp.service_order_id = ?
        ORDER BY sp.timestamp DESC
    `, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

// Serve static files from React app (Production)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Handle SPA routing - return index.html for any unknown route
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
