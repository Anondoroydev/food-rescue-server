import { query } from '../config/db';
import { Review } from '../types';

export class ReviewModel {
  static async create(reviewData: Partial<Review>): Promise<Review> {
    const { from_user_id, to_user_id, request_id, rating, comment } = reviewData;
    const res = await query(
      `INSERT INTO reviews (from_user_id, to_user_id, request_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [from_user_id, to_user_id, request_id || null, rating, comment || null]
    );
    return res.rows[0];
  }

  static async findByUser(userId: number): Promise<Review[]> {
    const res = await query(
      `SELECT r.*, u.name as to_user_name
       FROM reviews r
       JOIN users u ON r.to_user_id = u.id
       WHERE r.from_user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  static async findByTarget(targetId: number): Promise<Review[]> {
    const res = await query(
      `SELECT r.*, u.name as from_user_name
       FROM reviews r
       JOIN users u ON r.from_user_id = u.id
       WHERE r.to_user_id = $1
       ORDER BY r.created_at DESC`,
      [targetId]
    );
    return res.rows;
  }

  static async getAverageRating(userId: number): Promise<number> {
    const res = await query(
      `SELECT AVG(rating) as avg_rating FROM reviews WHERE to_user_id = $1`,
      [userId]
    );
    const avg = res.rows[0]?.avg_rating;
    return avg ? parseFloat(parseFloat(avg).toFixed(1)) : 5.0;
  }

  static async delete(id: number): Promise<boolean> {
    const res = await query(`DELETE FROM reviews WHERE id = $1`, [id]);
    return (res.rowCount || 0) > 0;
  }
}
