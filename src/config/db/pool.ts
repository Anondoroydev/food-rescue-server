import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 1500 }
  : { host: process.env.PGHOST || 'localhost', port: parseInt(process.env.PGPORT || '5432', 10), database: process.env.PGDATABASE || 'food_rescue_db', user: process.env.PGUSER || 'postgres', password: process.env.PGPASSWORD || 'postgres', max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 1500 };

export const pool = new Pool(poolConfig as any);

export default pool;
