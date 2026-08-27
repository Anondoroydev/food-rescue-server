import { query } from '../config/db';
import { SystemLog } from '../types';

export class SystemLogModel {
  static async create(logData: Partial<SystemLog>): Promise<SystemLog> {
    const { user_id, action, details, ip_address, user_agent } = logData;
    const res = await query(
      `INSERT INTO system_logs (user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id || null, action, details ? JSON.stringify(details) : null, ip_address || null, user_agent || null]
    );
    return res.rows[0];
  }

  static async findAll(limit: number = 100): Promise<SystemLog[]> {
    const res = await query(
      `SELECT sl.*, u.name as user_name
       FROM system_logs sl
       LEFT JOIN users u ON sl.user_id = u.id
       ORDER BY sl.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  }

  static async delete(id: number): Promise<boolean> {
    const res = await query(`DELETE FROM system_logs WHERE id = $1`, [id]);
    return (res.rowCount || 0) > 0;
  }

  static async cleanup(daysOld: number = 30): Promise<number> {
    const res = await query(
      `DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '${daysOld} days'`
    );
    return res.rowCount || 0;
  }
}
