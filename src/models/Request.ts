import { query } from '../config/db';
import { FoodRequest, RequestStatus } from '../types';

export class RequestModel {
  static async create(requestData: Partial<FoodRequest>): Promise<FoodRequest> {
    const { food_id, ngo_id, request_message, collection_time, collection_date } = requestData;
    const res = await query(
      `INSERT INTO requests (food_id, ngo_id, request_message, collection_time, collection_date, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [food_id, ngo_id, request_message || null, collection_time || null, collection_date || null]
    );
    return res.rows[0];
  }

  static async findById(id: number): Promise<FoodRequest | null> {
    const res = await query(
      `SELECT r.*, f.food_name, f.restaurant_id, u1.name as restaurant_name, u2.name as ngo_name, u2.organization_name as ngo_organization
       FROM requests r
       JOIN foods f ON r.food_id = f.id
       JOIN users u1 ON f.restaurant_id = u1.id
       JOIN users u2 ON r.ngo_id = u2.id
       WHERE r.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByNGO(ngoId: number): Promise<FoodRequest[]> {
    const res = await query(
      `SELECT r.*, f.food_name, f.quantity, f.food_type, f.image, u.name as restaurant_name, u.organization_name, u.phone, u.address
       FROM requests r
       JOIN foods f ON r.food_id = f.id
       JOIN users u ON f.restaurant_id = u.id
       WHERE r.ngo_id = $1
       ORDER BY r.created_at DESC`,
      [ngoId]
    );
    return res.rows;
  }

  static async findByRestaurant(restaurantId: number): Promise<FoodRequest[]> {
    const res = await query(
      `SELECT r.*, f.food_name, f.quantity, f.food_type, f.image, u.name as ngo_name, u.organization_name as ngo_organization, u.phone as ngo_phone, u.email as ngo_email
       FROM requests r
       JOIN foods f ON r.food_id = f.id
       JOIN users u ON r.ngo_id = u.id
       WHERE f.restaurant_id = $1
       ORDER BY r.created_at DESC`,
      [restaurantId]
    );
    return res.rows;
  }

  static async findByFood(foodId: number): Promise<FoodRequest[]> {
    const res = await query(
      `SELECT r.*, u.name as ngo_name, u.organization_name as ngo_organization, u.phone, u.email
       FROM requests r
       JOIN users u ON r.ngo_id = u.id
       WHERE r.food_id = $1
       ORDER BY r.created_at DESC`,
      [foodId]
    );
    return res.rows;
  }

  static async updateStatus(id: number, status: RequestStatus): Promise<FoodRequest | null> {
    let timestampField = '';
    if (status === 'approved') timestampField = ', approved_at = NOW()';
    else if (status === 'rejected') timestampField = ', rejected_at = NOW()';
    else if (status === 'collected') timestampField = ', collected_at = NOW()';
    else if (status === 'delivered') timestampField = ', delivered_at = NOW()';

    const res = await query(
      `UPDATE requests SET status = $1 ${timestampField} WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return res.rows[0] || null;
  }

  static async approve(id: number): Promise<FoodRequest | null> {
    return this.updateStatus(id, 'approved');
  }

  static async reject(id: number): Promise<FoodRequest | null> {
    return this.updateStatus(id, 'rejected');
  }

  static async collect(id: number): Promise<FoodRequest | null> {
    return this.updateStatus(id, 'collected');
  }

  static async deliver(id: number): Promise<FoodRequest | null> {
    return this.updateStatus(id, 'delivered');
  }
}
