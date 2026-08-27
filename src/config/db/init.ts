import bcrypt from 'bcryptjs';
import { pool } from './pool';
import { query } from './query';
import { logInfo, logError } from '../../utils/logger';

export const initDB = async () => {
  try {
    const client = await pool.connect();
    client.release();
    logInfo('Connected to PostgreSQL database successfully.');

    await query(`
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
  } catch (error: any) {
    logError(`PostgreSQL unavailable: ${error.message}`);
    throw error;
  }

  const adminCheck = await query(`SELECT id FROM users WHERE email = 'admin@foodrescue.com'`);
  if (adminCheck.rows.length === 0) {
    const hashedPass = await bcrypt.hash('admin123', 10);
    await query(`
      INSERT INTO users (name, email, password, phone, address, role, organization_name, is_active)
      VALUES ('System Administrator', 'admin@foodrescue.com', $1, '+1234567890', 'HQ Central', 'admin', 'Food Rescue HQ', 1)
    `, [hashedPass]);
    logInfo('Admin user created (email: admin@foodrescue.com, password: admin123)');
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
    await query(`
      INSERT INTO food_categories (name, description, icon)
      VALUES ($1, $2, $3)
      ON CONFLICT (name) DO NOTHING
    `, [cat.name, cat.description, cat.icon]);
  }

  logInfo('Database tables, triggers, indexes, and seed data initialized successfully.');
};

export default initDB;
