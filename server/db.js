const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'inventory.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath + ': ' + err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1
  )`);

  // Items table
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    part_number TEXT,
    category TEXT,
    footprint TEXT,
    total_qty INTEGER DEFAULT 0,
    location TEXT,
    notes TEXT,
    image_path TEXT,
    datasheet_url TEXT
  )`);

  // Migration for existing tables if needed (simplistic check)
  db.all("PRAGMA table_info(items)", (err, rows) => {
    if (!err && rows) {
      const hasImagePath = rows.some(r => r.name === 'image_path');
      const hasPartNumber = rows.some(r => r.name === 'part_number');
      const hasFootprint = rows.some(r => r.name === 'footprint');
      const hasDatasheetUrl = rows.some(r => r.name === 'datasheet_url');

      if (!hasImagePath) {
        db.run("ALTER TABLE items ADD COLUMN image_path TEXT", (err) => {
          if (err) console.error("Error adding image_path column:", err.message);
          else console.log("Added image_path column to items table.");
        });
      }
      if (!hasPartNumber) {
        db.run("ALTER TABLE items ADD COLUMN part_number TEXT", (err) => {
          if (err) console.error("Error adding part_number column:", err.message);
          else console.log("Added part_number column to items table.");
        });
      }
      if (!hasFootprint) {
        db.run("ALTER TABLE items ADD COLUMN footprint TEXT", (err) => {
          if (err) console.error("Error adding footprint column:", err.message);
          else console.log("Added footprint column to items table.");
        });
      }
      if (!hasDatasheetUrl) {
        db.run("ALTER TABLE items ADD COLUMN datasheet_url TEXT", (err) => {
          if (err) console.error("Error adding datasheet_url column:", err.message);
          else console.log("Added datasheet_url column to items table.");
        });
      }
    }
  });

  // Transactions table with user_id
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'IN' or 'OUT'
    qty INTEGER NOT NULL,
    project_ref TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (item_id) REFERENCES items (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Migration: Add user_id to existing transactions table
  db.all("PRAGMA table_info(transactions)", (err, rows) => {
    if (!err && rows) {
      const hasUserId = rows.some(r => r.name === 'user_id');
      if (!hasUserId) {
        db.run("ALTER TABLE transactions ADD COLUMN user_id INTEGER DEFAULT 1", (err) => {
          if (err) console.error("Error adding user_id column:", err.message);
          else console.log("Added user_id column to transactions table.");
        });
      }
    }
  });

  // Service Orders table
  db.run(`CREATE TABLE IF NOT EXISTS service_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    serial_number TEXT,
    customer_name TEXT NOT NULL,
    customer_contact TEXT,
    complaint TEXT NOT NULL,
    diagnosis TEXT,
    actions_taken TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    date_received DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME,
    completed_date DATETIME,
    technician_id INTEGER,
    cost_estimate REAL,
    notes TEXT,
    created_by INTEGER,
    FOREIGN KEY (technician_id) REFERENCES users (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
  )`);

  // Service Parts Used table
  db.run(`CREATE TABLE IF NOT EXISTS service_parts_used (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_order_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_order_id) REFERENCES service_orders (id),
    FOREIGN KEY (item_id) REFERENCES items (id)
  )`);

  // Create default admin user if not exists
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(
        "INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)",
        ['admin', hashedPassword, 'Administrator', 'admin'],
        (err) => {
          if (err) {
            console.error("Error creating default admin:", err.message);
          } else {
            console.log("✅ Default admin user created (username: admin, password: admin123)");
          }
        }
      );
    }
  });
});

module.exports = db;
