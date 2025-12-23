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
// Add stock (IN) - Create item if not exists or update qty. Handles Image Upload.
app.post('/api/inventory/in', authMiddleware, upload.single('image'), (req, res) => {
    const { name, part_number, category, footprint, qty, location, project_ref, notes, datasheet_url, item_type, is_new } = req.body;
    const image_path = req.file ? `/uploads/${req.file.filename}` : null;
    const user_id = req.user.id;
    const type = item_type || 'consumable'; // Default to consumable

    if (!name || !qty) {
        return res.status(400).json({ error: 'Name and Qty are required' });
    }

    // Check if item exists (Strict check: Name AND Footprint must match)
    // If footprint is provided, we match it. If not, we match where footprint is null or empty? 
    // Standardizing: Empty string footprint matches empty string.

    // Logic: 
    // If client sends is_new='true', we expect NO match. If match -> 409.

    // We need to handle potential null footprint in DB vs empty string (or vice versa). 
    // Best effort: checking name and footprint.

    const targetFootprint = footprint || '';

    db.get('SELECT * FROM items WHERE name = ? AND (footprint = ? OR (footprint IS NULL AND ? = ""))', [name, targetFootprint, targetFootprint], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        const timestamp = new Date().toISOString();
        const quantity = parseInt(qty);

        if (row) {
            // MATCH FOUND

            // If user intended to create NEW item (is_new flag string "true"), deny it.
            if (is_new === 'true' || is_new === true) {
                return res.status(409).json({ error: `Item "${name}" with footprint "${targetFootprint}" already exists. Please use 'Restock' instead.` });
            }

            // Update existing item
            let sql = 'UPDATE items SET total_qty = ?, location = COALESCE(?, location), item_type = COALESCE(?, item_type)';
            let params = [row.total_qty + quantity, location, type];

            if (image_path) {
                sql += ', image_path = ?';
                params.push(image_path);
            }

            if (part_number) {
                sql += ', part_number = ?';
                params.push(part_number);
            }
            // We update other fields too if provided, but footprint is part of identity now so we keeping it same usually.
            // But if user edits existing item? This is IN transaction, not EDIT.

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
            // NO MATCH - Create new item
            db.run('INSERT INTO items (name, part_number, category, footprint, total_qty, location, notes, image_path, datasheet_url, item_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [name, part_number, category, footprint, quantity, location, notes, image_path, datasheet_url, type],
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

// Move item (Location Change)
app.post('/api/inventory/move', authMiddleware, (req, res) => {
    const { item_id, new_location, project_ref, notes } = req.body;
    const user_id = req.user.id;

    if (!item_id || !new_location) {
        return res.status(400).json({ error: 'Item ID and New Location are required' });
    }

    db.get('SELECT * FROM items WHERE id = ?', [item_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Item not found' });

        const old_location = row.location || 'Unknown';
        const timestamp = new Date().toISOString();
        const moveNotes = `Moved from ${old_location} to ${new_location}. ${notes || ''}`;

        db.run('UPDATE items SET location = ? WHERE id = ?', [new_location, item_id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Log transaction with user_id
            db.run('INSERT INTO transactions (item_id, user_id, type, qty, project_ref, timestamp, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [item_id, user_id, 'MOVE', 0, project_ref, timestamp, moveNotes]);

            res.json({ message: 'Item moved', itemId: item_id, newLocation: new_location });
        });
    });
});

// Delete inventory item
app.delete('/api/inventory/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const user_id = req.user.id;

    if (!password) {
        return res.status(400).json({ error: 'Password required' });
    }

    // Verify password first
    db.get('SELECT password FROM users WHERE id = ?', [user_id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isValid = bcrypt.compareSync(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Proceed with delete
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

// Export Inventory to CSV
app.get('/api/inventory/export', authMiddleware, (req, res) => {
    db.all('SELECT * FROM items ORDER BY name ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const headers = ['ID', 'Name', 'Part Number', 'Category', 'Footprint', 'Qty', 'Location', 'Item Type', 'Notes'];
        const csvRows = [headers.join(',')];

        rows.forEach(row => {
            const values = [
                row.id,
                `"${(row.name || '').replace(/"/g, '""')}"`,
                `"${(row.part_number || '').replace(/"/g, '""')}"`,
                `"${(row.category || '').replace(/"/g, '""')}"`,
                `"${(row.footprint || '').replace(/"/g, '""')}"`,
                row.total_qty,
                `"${(row.location || '').replace(/"/g, '""')}"`,
                `"${(row.item_type || 'consumable').replace(/"/g, '""')}"`,
                `"${(row.notes || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(values.join(','));
        });

        res.header('Content-Type', 'text/csv');
        res.attachment('inventory_export.csv');
        res.send(csvRows.join('\n'));
    });
});

// Export History to CSV
app.get('/api/history/export', authMiddleware, (req, res) => {
    db.all(`
        SELECT t.*, i.name as item_name, u.username 
        FROM transactions t 
        JOIN items i ON t.item_id = i.id 
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.timestamp DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const headers = ['Date', 'Type', 'Item Name', 'Qty', 'User', 'Project Ref', 'Notes'];
        const csvRows = [headers.join(',')];

        rows.forEach(row => {
            const values = [
                `"${new Date(row.timestamp).toLocaleString()}"`,
                row.type,
                `"${(row.item_name || '').replace(/"/g, '""')}"`,
                row.qty,
                `"${(row.username || '').replace(/"/g, '""')}"`,
                `"${(row.project_ref || '').replace(/"/g, '""')}"`,
                `"${(row.notes || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(values.join(','));
        });

        res.header('Content-Type', 'text/csv');
        res.attachment('transaction_history.csv');
        res.send(csvRows.join('\n'));
    });
});

// --- BOM APIs ---

// Get all BOMs
app.get('/api/boms', authMiddleware, (req, res) => {
    db.all('SELECT * FROM boms ORDER BY name ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'success', data: rows });
    });
});

// Create new BOM
app.post('/api/boms', authMiddleware, (req, res) => {
    const { name, description, items } = req.body;
    // items is array of { item_id, qty }

    if (!name) return res.status(400).json({ error: 'BOM name is required' });

    // Check if BOM with same name exists
    db.get('SELECT id FROM boms WHERE name = ?', [name], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            return res.status(409).json({ error: 'A BOM with this name already exists' });
        }

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            db.run(
                'INSERT INTO boms (name, description, created_by) VALUES (?, ?, ?)',
                [name, description, req.user.id],
                function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    const bomId = this.lastID;

                    if (!items || items.length === 0) {
                        db.run('COMMIT');
                        return res.json({ message: 'BOM created (empty)', id: bomId });
                    }

                    const stmt = db.prepare('INSERT INTO bom_items (bom_id, item_id, qty) VALUES (?, ?, ?)');
                    items.forEach(item => {
                        stmt.run(bomId, item.item_id, item.qty);
                    });
                    stmt.finalize(err => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        db.run('COMMIT');
                        res.json({ message: 'BOM created successfully', id: bomId });
                    });
                }
            );
        });
    });
});

// Update BOM
app.put('/api/boms/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { name, description, items } = req.body;

    if (!name) return res.status(400).json({ error: 'BOM name is required' });

    // Check if BOM with same name exists (excluding current BOM)
    db.get('SELECT id FROM boms WHERE name = ? AND id != ?', [name, id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            return res.status(409).json({ error: 'A BOM with this name already exists' });
        }

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // Update BOM details
            db.run(
                'UPDATE boms SET name = ?, description = ? WHERE id = ?',
                [name, description, id],
                function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }

                    // Delete existing items
                    db.run('DELETE FROM bom_items WHERE bom_id = ?', [id], err => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }

                        if (!items || items.length === 0) {
                            db.run('COMMIT');
                            return res.json({ message: 'BOM updated (items cleared)' });
                        }

                        // Insert new items
                        const stmt = db.prepare('INSERT INTO bom_items (bom_id, item_id, qty) VALUES (?, ?, ?)');
                        items.forEach(item => {
                            stmt.run(id, item.item_id, item.qty);
                        });
                        stmt.finalize(err => {
                            if (err) {
                                db.run('ROLLBACK');
                                return res.status(500).json({ error: err.message });
                            }
                            db.run('COMMIT');
                            res.json({ message: 'BOM updated successfully' });
                        });
                    });
                }
            );
        });
    });
});

// Get BOM details (with items)
app.get('/api/boms/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM boms WHERE id = ?', [id], (err, bom) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!bom) return res.status(404).json({ error: 'BOM not found' });

        db.all(
            `SELECT bi.*, i.name, i.part_number, i.category, i.total_qty as current_stock 
             FROM bom_items bi 
             JOIN items i ON bi.item_id = i.id 
             WHERE bi.bom_id = ?`,
            [id],
            (err, items) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'success', data: { ...bom, items } });
            }
        );
    });
});

// Delete BOM
app.delete('/api/boms/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM boms WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'BOM deleted' });
    });
});

// Execute BOM (Deduct stock)
app.post('/api/boms/:id/execute', authMiddleware, (req, res) => {
    const { id } = req.params;
    const { project_name, multiplier = 1 } = req.body;
    const userId = req.user.id; // Corrected from req.user.userId based on authMiddleware

    if (!project_name) return res.status(400).json({ error: 'Project name is required' });

    // 1. Get BOM items
    db.all('SELECT * FROM bom_items WHERE bom_id = ?', [id], (err, bomItems) => {
        if (err) return res.status(500).json({ error: err.message });
        if (bomItems.length === 0) return res.status(400).json({ error: 'BOM has no items' });

        // 2. Check stock
        // We need to check all items stock first. 
        // A complex query or iterating. Let's iterate with a Promise.all approach or serialize.
        // Since sqlite3 is callback based, let's use serialize + checks.

        // Actually, let's just do it inside a transaction. 
        // If stock goes negative, checking beforehand is better for UX.

        const timestamp = new Date().toISOString();
        const required = bomItems.map(bi => ({ ...bi, required_qty: bi.qty * multiplier }));
        const itemIds = required.map(r => r.item_id);

        db.all(`SELECT id, total_qty, name FROM items WHERE id IN (${itemIds.join(',')})`, [], (err, stockItems) => {
            if (err) return res.status(500).json({ error: err.message });

            // Map for quick lookup
            const stockMap = {};
            stockItems.forEach(si => stockMap[si.id] = si);

            const missing = [];
            required.forEach(reqItem => {
                const stockItem = stockMap[reqItem.item_id];
                if (!stockItem || stockItem.total_qty < reqItem.required_qty) {
                    missing.push(`${stockItem ? stockItem.name : 'Unknown Item'} (Need ${reqItem.required_qty}, Have ${stockItem ? stockItem.total_qty : 0})`);
                }
            });

            if (missing.length > 0) {
                return res.status(400).json({ error: 'Insufficient stock: ' + missing.join(', ') });
            }

            // 3. Deduct and Log
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                let errorOccurred = false;

                const stmtUpdate = db.prepare('UPDATE items SET total_qty = total_qty - ? WHERE id = ?');
                const stmtLog = db.prepare('INSERT INTO transactions (item_id, user_id, type, qty, project_ref, timestamp, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');

                // We need to fetch BOM name for logs
                db.get('SELECT name FROM boms WHERE id = ?', [id], (err, bom) => {
                    if (err) { // Should not happen usually if we got here
                        db.run('ROLLBACK');
                        return res.status(500).json({ error: err.message });
                    }
                    const bomName = bom ? bom.name : 'Unknown BOM';

                    required.forEach(item => {
                        stmtUpdate.run(item.required_qty, item.item_id);
                        stmtLog.run(
                            item.item_id,
                            userId,
                            'OUT',
                            item.required_qty,
                            project_name,
                            timestamp,
                            `BOM Execution: ${bomName} (x${multiplier})`
                        );
                    });

                    stmtUpdate.finalize();
                    stmtLog.finalize(err => {
                        if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({ error: err.message });
                        }
                        db.run('COMMIT');
                        res.json({ message: 'BOM executed successfully' });
                    });
                });
            });
        });
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
