"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = exports.query = void 0;
const pg_1 = require("pg");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
dotenv_1.default.config();
let useSQLiteFallback = false;
let sqliteDb = null;
const pool = new pg_1.Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'food_rescue_db',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 1500
});
const query = async (text, params = []) => {
    if (!useSQLiteFallback) {
        try {
            const res = await pool.query(text, params);
            return { rows: res.rows, rowCount: res.rowCount || res.rows.length };
        }
        catch (err) {
            if (err.code === 'ECONNREFUSED' || err.message?.includes('connect ECONNREFUSED')) {
                (0, logger_1.logWarn)('PostgreSQL connection unavailable. Switching to embedded SQLite database fallback.');
                useSQLiteFallback = true;
                initSQLite();
                return (0, exports.query)(text, params);
            }
            throw err;
        }
    }
    // SQLite Fallback query executor
    if (!sqliteDb) {
        initSQLite();
    }
    try {
        // 1. Convert PostgreSQL $1, $2 parameter placeholders to SQLite ? placeholders
        let sqliteSql = text.replace(/\$(\d+)/g, () => '?');
        // 2. Adjust PostgreSQL specific syntax for SQLite compatibility
        if (sqliteSql.includes('ON CONFLICT (name) DO NOTHING')) {
            sqliteSql = sqliteSql.replace('INSERT INTO', 'INSERT OR IGNORE INTO').replace('ON CONFLICT (name) DO NOTHING', '');
        }
        sqliteSql = sqliteSql
            .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
            .replace(/JSONB/gi, 'TEXT')
            .replace(/ILIKE/gi, 'LIKE')
            .replace(/NOW\(\)/gi, "DATETIME('now')")
            .replace(/INTERVAL '(\d+) (hours|days)'/gi, "'-$1 $2'")
            .replace(/RETURNING \*/gi, '')
            .replace(/RETURNING id, food_name/gi, '');
        const trimmedSql = sqliteSql.trim().toUpperCase();
        if (trimmedSql.startsWith('SELECT')) {
            const stmt = sqliteDb.prepare(sqliteSql);
            const rows = stmt.all(...params);
            return { rows, rowCount: rows.length };
        }
        else if (trimmedSql.startsWith('INSERT')) {
            const stmt = sqliteDb.prepare(sqliteSql);
            const info = stmt.run(...params);
            let rows = [];
            if (text.includes('RETURNING')) {
                const selectLast = sqliteDb.prepare('SELECT * FROM ' + getTableNameFromQuery(text) + ' WHERE id = ?');
                const insertedRow = selectLast.get(info.lastInsertRowid);
                if (insertedRow)
                    rows = [insertedRow];
            }
            return { rows, rowCount: info.changes };
        }
        else {
            const stmt = sqliteDb.prepare(sqliteSql);
            const info = stmt.run(...params);
            return { rows: [], rowCount: info.changes };
        }
    }
    catch (err) {
        (0, logger_1.logError)(`SQLite query execution error: ${err.message} | SQL: ${text}`);
        return { rows: [], rowCount: 0 };
    }
};
exports.query = query;
const getTableNameFromQuery = (sql) => {
    const match = sql.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
    return match ? match[1] : 'users';
};
const initSQLite = () => {
    if (sqliteDb)
        return;
    const dbPath = path_1.default.join(process.cwd(), 'food_rescue.db');
    sqliteDb = new better_sqlite3_1.default(dbPath);
    sqliteDb.pragma('foreign_keys = ON');
    sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT,
      role TEXT NOT NULL CHECK (role IN ('restaurant', 'ngo', 'admin')),
      organization_name TEXT,
      latitude REAL,
      longitude REAL,
      profile_image TEXT,
      is_active INTEGER DEFAULT 1,
      reset_token TEXT,
      reset_token_expiry DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      food_name TEXT NOT NULL,
      description TEXT,
      quantity TEXT NOT NULL,
      food_type TEXT NOT NULL CHECK (food_type IN ('vegetarian', 'non-vegetarian', 'both')),
      image TEXT,
      pickup_time TEXT,
      pickup_date TEXT,
      expiry_time DATETIME,
      status TEXT DEFAULT 'available' CHECK (status IN ('available', 'requested', 'collected', 'expired')),
      view_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
      ngo_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'collected', 'delivered')),
      request_message TEXT,
      collection_time TEXT,
      collection_date TEXT,
      approved_at DATETIME,
      rejected_at DATETIME,
      collected_at DATETIME,
      delivered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
      restaurant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ngo_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
      quantity TEXT NOT NULL,
      collected_at DATETIME,
      delivered_at DATETIME,
      status TEXT DEFAULT 'collected' CHECK (status IN ('collected', 'delivered', 'cancelled')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      reference_id INTEGER,
      reference_type TEXT,
      is_read INTEGER DEFAULT 0,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS qr_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      qr_code TEXT NOT NULL,
      token TEXT NOT NULL,
      is_used INTEGER DEFAULT 0,
      used_at DATETIME,
      expiry_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS food_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_foods_restaurant ON foods(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_foods_status ON foods(status);
    CREATE INDEX IF NOT EXISTS idx_requests_food ON requests(food_id);
    CREATE INDEX IF NOT EXISTS idx_requests_ngo ON requests(ngo_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_chat_sender ON chat_messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_chat_receiver ON chat_messages(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_qr_token ON qr_codes(token);
  `);
};
const initDB = async () => {
    try {
        const client = await pool.connect();
        client.release();
        (0, logger_1.logInfo)('Connected to PostgreSQL database successfully.');
        await (0, exports.query)(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address TEXT,
        role VARCHAR(20) NOT NULL CHECK (role IN ('restaurant', 'ngo', 'admin')),
        organization_name VARCHAR(255),
        latitude NUMERIC(10, 7),
        longitude NUMERIC(10, 7),
        profile_image VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS foods (
        id SERIAL PRIMARY KEY,
        restaurant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        food_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity VARCHAR(100) NOT NULL,
        food_type VARCHAR(20) NOT NULL CHECK (food_type IN ('vegetarian', 'non-vegetarian', 'both')),
        image VARCHAR(255),
        pickup_time VARCHAR(100),
        pickup_date DATE,
        expiry_time TIMESTAMP,
        status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'requested', 'collected', 'expired')),
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
        ngo_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'collected', 'delivered')),
        request_message TEXT,
        collection_time VARCHAR(100),
        collection_date DATE,
        approved_at TIMESTAMP,
        rejected_at TIMESTAMP,
        collected_at TIMESTAMP,
        delivered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
        restaurant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ngo_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
        quantity VARCHAR(100) NOT NULL,
        collected_at TIMESTAMP,
        delivered_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'collected' CHECK (status IN ('collected', 'delivered', 'cancelled')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(30) NOT NULL CHECK (type IN ('food_posted', 'request_received', 'request_approved', 'request_rejected', 'reminder', 'alert', 'message')),
        reference_id INTEGER,
        reference_type VARCHAR(50),
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS qr_codes (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
        qr_code TEXT NOT NULL,
        token VARCHAR(255) NOT NULL,
        is_used BOOLEAN DEFAULT false,
        used_at TIMESTAMP,
        expiry_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS food_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(255) NOT NULL,
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_foods_restaurant ON foods(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_foods_status ON foods(status);
      CREATE INDEX IF NOT EXISTS idx_requests_food ON requests(food_id);
      CREATE INDEX IF NOT EXISTS idx_requests_ngo ON requests(ngo_id);
      CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_chat_sender ON chat_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_chat_receiver ON chat_messages(receiver_id);
      CREATE INDEX IF NOT EXISTS idx_qr_token ON qr_codes(token);

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
      END;
      $$ language 'plpgsql';

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
          CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_foods_updated_at') THEN
          CREATE TRIGGER update_foods_updated_at BEFORE UPDATE ON foods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_requests_updated_at') THEN
          CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);
    }
    catch (error) {
        (0, logger_1.logWarn)(`PostgreSQL unavailable. Initializing embedded SQLite database fallback.`);
        useSQLiteFallback = true;
        initSQLite();
    }
    // Seed Admin user
    const adminCheck = await (0, exports.query)(`SELECT id FROM users WHERE email = 'admin@foodrescue.com'`);
    if (adminCheck.rows.length === 0) {
        const hashedPass = await bcryptjs_1.default.hash('admin123', 10);
        await (0, exports.query)(`
      INSERT INTO users (name, email, password, phone, address, role, organization_name, is_active)
      VALUES ('System Administrator', 'admin@foodrescue.com', $1, '+1234567890', 'HQ Central', 'admin', 'Food Rescue HQ', 1)
    `, [hashedPass]);
        (0, logger_1.logInfo)('Admin user created (email: admin@foodrescue.com, password: admin123)');
    }
    const categories = [
        { name: 'Rice-Bread', description: 'Fresh rice, bread, naan, and bakery staples', icon: '🍚' },
        { name: 'Curry', description: 'Gravies, lentil soups, stews, and vegetable curries', icon: '🍛' },
        { name: 'Fish-Meat', description: 'Cooked poultry, fish, seafood, and meat dishes', icon: '🍗' },
        { name: 'Salad', description: 'Fresh green salads, cut vegetables, and fruits', icon: '🥗' },
        { name: 'Sweets', description: 'Desserts, cakes, puddings, and sweet treats', icon: '🍰' },
        { name: 'Beverages', description: 'Juices, milk products, and packaged drinks', icon: '🥤' }
    ];
    for (const cat of categories) {
        await (0, exports.query)(`
      INSERT INTO food_categories (name, description, icon)
      VALUES ($1, $2, $3)
      ON CONFLICT (name) DO NOTHING
    `, [cat.name, cat.description, cat.icon]);
    }
    (0, logger_1.logInfo)('Database tables, triggers, indexes, and seed data initialized successfully.');
};
exports.initDB = initDB;
exports.default = pool;
