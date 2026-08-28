import bcrypt from 'bcryptjs';
import { db } from './pool';
import { query } from './query';
import { logInfo, logError } from '../../utils/logger';

export const initDB = async () => {
  try {
    // Create tables using SQLite-compatible DDL
    db.exec(`
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
        reset_token_expiry TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
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
        expiry_time TEXT,
        status TEXT DEFAULT 'available' CHECK (status IN ('available', 'requested', 'collected', 'expired')),
        view_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
        ngo_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'collected', 'delivered')),
        request_message TEXT,
        collection_time TEXT,
        collection_date TEXT,
        approved_at TEXT,
        rejected_at TEXT,
        collected_at TEXT,
        delivered_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
        restaurant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ngo_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
        quantity TEXT NOT NULL,
        collected_at TEXT,
        delivered_at TEXT,
        status TEXT DEFAULT 'collected' CHECK (status IN ('collected', 'delivered', 'cancelled')),
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('food_posted', 'request_received', 'request_approved', 'request_rejected', 'reminder', 'alert', 'message')),
        reference_id INTEGER,
        reference_type TEXT,
        is_read INTEGER DEFAULT 0,
        read_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        read_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS qr_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
        qr_code TEXT NOT NULL,
        token TEXT NOT NULL,
        is_used INTEGER DEFAULT 0,
        used_at TEXT,
        expiry_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS food_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        icon TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Create indexes
    db.exec(`
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

    logInfo('Connected to SQLite database successfully.');
  } catch (error: any) {
    logError(`SQLite initialization error: ${error.message}`);
    throw error;
  }

  // Seed admin user
  const adminCheck = await query(`SELECT id FROM users WHERE email = ?`, ['admin@foodrescue.com']);
  if (adminCheck.rows.length === 0) {
    const hashedPass = await bcrypt.hash('admin123', 10);
    await query(`
      INSERT INTO users (name, email, password, phone, address, role, organization_name, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, ['System Administrator', 'admin@foodrescue.com', hashedPass, '+1234567890', 'HQ Central', 'admin', 'Food Rescue HQ']);
    logInfo('Admin user created (email: admin@foodrescue.com, password: admin123)');
  }

  // Seed categories
  const categories = [
    { name: 'Rice-Bread', description: 'Fresh rice, bread, naan, and bakery staples', icon: '🍚' },
    { name: 'Curry', description: 'Gravies, lentil soups, stews, and vegetable curries', icon: '🍛' },
    { name: 'Fish-Meat', description: 'Cooked poultry, fish, seafood, and meat dishes', icon: '🍗' },
    { name: 'Salad', description: 'Fresh green salads, cut vegetables, and fruits', icon: '🥗' },
    { name: 'Sweets', description: 'Desserts, cakes, puddings, and sweet treats', icon: '🍰' },
    { name: 'Beverages', description: 'Juices, milk products, and packaged drinks', icon: '🥤' }
  ];

  for (const cat of categories) {
    await query(`
      INSERT OR IGNORE INTO food_categories (name, description, icon)
      VALUES (?, ?, ?)
    `, [cat.name, cat.description, cat.icon]);
  }

  logInfo('Database tables, indexes, and seed data initialized successfully.');
};

export default initDB;
