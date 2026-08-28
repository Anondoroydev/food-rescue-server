import { query } from '../config/db';
import { Notification } from '../types';

export class NotificationModel {
  static async create(notificationData: Partial<Notification>): Promise<Notification> {
    const { user_id, sender_id, title, message, type, reference_id, reference_type } = notificationData;
    const res = await query(
      `INSERT INTO notifications (user_id, sender_id, title, message, type, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, sender_id || null, title, message, type, reference_id || null, reference_type || null]
    );
    return res.rows[0];
  }

  static async findByUser(userId: number): Promise<Notification[]> {
    const res = await query(
      `SELECT n.*, u.name as sender_name
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  static async markAsRead(id: number): Promise<boolean> {
    const res = await query(
      `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1`,
      [id]
    );
    return (res.rowCount || 0) > 0;
  }

  static async markAllAsRead(userId: number): Promise<boolean> {
    const res = await query(
      `UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return (res.rowCount || 0) > 0;
  }

  static async delete(id: number): Promise<boolean> {
    const res = await query(`DELETE FROM notifications WHERE id = $1`, [id]);
    return (res.rowCount || 0) > 0;
  }
}
