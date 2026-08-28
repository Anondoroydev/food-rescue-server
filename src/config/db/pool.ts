import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const getDbPath = (): string => {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;

  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
  if (isVercel) {
    const tmpDbPath = path.join('/tmp', 'food_rescue.db');
    const localDbPath = path.join(process.cwd(), 'food_rescue.db');

    if (!fs.existsSync(tmpDbPath) && fs.existsSync(localDbPath)) {
      try {
        fs.copyFileSync(localDbPath, tmpDbPath);
      } catch (_) {}
    }
    return tmpDbPath;
  }

  return path.join(process.cwd(), 'food_rescue.db');
};

let db: InstanceType<typeof Database>;

try {
  const dbPath = getDbPath();
  db = new Database(dbPath);
  try {
    db.pragma('journal_mode = WAL');
  } catch (_) {
    db.pragma('journal_mode = DELETE');
  }
  db.pragma('foreign_keys = ON');
} catch (_) {
  try {
    const fallbackPath = path.join('/tmp', 'food_rescue.db');
    db = new Database(fallbackPath);
    db.pragma('foreign_keys = ON');
  } catch (_) {
    db = new Database(':memory:') as any;
    db.pragma('foreign_keys = ON');
  }
}

export { db };
export default db;

