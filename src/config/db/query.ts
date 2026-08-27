import { pool } from './pool';
import { logError } from '../../utils/logger';

export const query = async (text: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> => {
  try {
    const res = await pool.query(text, params);
    return { rows: res.rows, rowCount: res.rowCount || res.rows.length };
  } catch (err: any) {
    logError(`PostgreSQL query error: ${err.message} | SQL: ${text}`);
    throw err;
  }
};
