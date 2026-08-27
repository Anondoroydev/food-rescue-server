import { query } from '../config/db';
import { QRCodeData } from '../types';

export class QRCodeModel {
  static async create(qrData: Partial<QRCodeData>): Promise<QRCodeData> {
    const { request_id, qr_code, token, expiry_at } = qrData;
    const res = await query(
      `INSERT INTO qr_codes (request_id, qr_code, token, expiry_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [request_id, qr_code, token, expiry_at || null]
    );
    return res.rows[0];
  }

  static async findByToken(token: string): Promise<QRCodeData | null> {
    const res = await query(`SELECT * FROM qr_codes WHERE token = $1`, [token]);
    return res.rows[0] || null;
  }

  static async findByRequest(requestId: number): Promise<QRCodeData | null> {
    const res = await query(`SELECT * FROM qr_codes WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1`, [requestId]);
    return res.rows[0] || null;
  }

  static async markAsUsed(id: number): Promise<boolean> {
    const res = await query(
      `UPDATE qr_codes SET is_used = true, used_at = NOW() WHERE id = $1`,
      [id]
    );
    return (res.rowCount || 0) > 0;
  }

  static async delete(id: number): Promise<boolean> {
    const res = await query(`DELETE FROM qr_codes WHERE id = $1`, [id]);
    return (res.rowCount || 0) > 0;
  }

  static async getExpired(): Promise<QRCodeData[]> {
    const res = await query(`SELECT * FROM qr_codes WHERE expiry_at < NOW() AND is_used = false`);
    return res.rows;
  }
}
