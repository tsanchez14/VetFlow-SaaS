const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'veterinary.db');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
    db.serialize(() => {
        // Enable Foreign Keys
        db.run("PRAGMA foreign_keys = ON");

        // Owners Table
        db.run(`CREATE TABLE IF NOT EXISTS owners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Pets Table
        db.run(`CREATE TABLE IF NOT EXISTS pets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER,
            name TEXT NOT NULL,
            species TEXT,
            breed TEXT,
            age INTEGER,
            weight REAL,
            photo TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
        )`);

        // Vets Table
        db.run(`CREATE TABLE IF NOT EXISTS vets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            specialty TEXT,
            phone TEXT
        )`);

        // Appointments Table
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pet_id INTEGER,
            vet_id INTEGER,
            display_name TEXT, -- For manual entry if pet_id is null
            phone TEXT,        -- Store phone for WA confirmation
            date DATE NOT NULL,
            time TIME NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'pending', -- pending, completed, cancelled
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (pet_id) REFERENCES pets(id),
            FOREIGN KEY (vet_id) REFERENCES vets(id)
        )`);

        // Suppliers Table
        db.run(`CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            contact TEXT,
            phone TEXT,
            email TEXT,
            products TEXT -- Summary of products supplied
        )`);

        // Products Table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INTEGER,
            name TEXT NOT NULL,
            category TEXT,
            stock INTEGER DEFAULT 0,
            unit TEXT,
            cost_price REAL,
            sell_price REAL,
            min_stock INTEGER DEFAULT 5,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        )`);

        // Sales Categories Table
        db.run(`CREATE TABLE IF NOT EXISTS sales_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )`);

        // Sales Table (Updated/New)
        db.run(`CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            description TEXT,
            category_id INTEGER,
            total REAL NOT NULL,
            discount REAL DEFAULT 0,
            owner_id INTEGER, -- Optional client
            payment_method TEXT, -- cash, transfer, card
            notes TEXT,
            FOREIGN KEY (owner_id) REFERENCES owners(id),
            FOREIGN KEY (category_id) REFERENCES sales_categories(id)
        )`);

        // Sale Items Table
        db.run(`CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER,
            product_id INTEGER,
            service_name TEXT, -- Optional, if it's a service instead of product
            quantity INTEGER,
            price REAL NOT NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id)
        )`);

        // Costs Table
        db.run(`CREATE TABLE IF NOT EXISTS costs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            description TEXT NOT NULL,
            type TEXT NOT NULL, -- Fixed / Variable
            category TEXT NOT NULL, -- Alquiler, Sueldos, Insumos, Servicios, Marketing, Otros
            amount REAL NOT NULL,
            frequency TEXT, -- mensual/anual (for fixed)
            supplier TEXT,
            is_recurring INTEGER DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Insert Default Sales Categories
        const defaultCategories = ['Productos', 'Servicios', 'Mayorista', 'Minorista'];
        defaultCategories.forEach(cat => {
            db.run(`INSERT OR IGNORE INTO sales_categories (name) VALUES (?)`, [cat]);
        });

        console.log("Database initialized successfully.");
    });
};

module.exports = {
    db,
    initDb
};
