import { query } from '../config/db';
import { Food } from '../types';
import { getDistance } from '../utils/helpers';

export class FoodModel {
  static async create(foodData: Partial<Food>): Promise<Food> {
    const {
      restaurant_id, food_name, description, quantity, food_type, image, pickup_time, pickup_date, expiry_time
    } = foodData;
    // Normalize dates to strings to be compatible with both pg and sqlite bindings
    let expiryVal: string | null = null;
    let pickupDateVal: string | null = null;
    if (expiry_time) {
      if ((expiry_time as any) instanceof Date) expiryVal = (expiry_time as any as Date).toISOString();
      else expiryVal = String(expiry_time);
    }
    if (pickup_date) {
      if ((pickup_date as any) instanceof Date) pickupDateVal = (pickup_date as any as Date).toISOString().split('T')[0];
      else pickupDateVal = String(pickup_date);
    }

    const res = await query(
      `INSERT INTO foods (restaurant_id, food_name, description, quantity, food_type, image, pickup_time, pickup_date, expiry_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [restaurant_id, food_name, description || null, quantity, food_type, image || null, pickup_time || null, pickupDateVal, expiryVal]
    );
    return res.rows[0];
  }

  static async findById(id: number): Promise<Food | null> {
    const res = await query(
      `SELECT f.*, u.name as restaurant_name, u.organization_name, u.address, u.phone, u.latitude, u.longitude
       FROM foods f
       JOIN users u ON f.restaurant_id = u.id
       WHERE f.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async incrementViewCount(id: number): Promise<void> {
    await query(`UPDATE foods SET view_count = view_count + 1 WHERE id = $1`, [id]);
  }

  static async findAll(filters: { status?: string; food_type?: string; search?: string } = {}): Promise<Food[]> {
    let sql = `
      SELECT f.*, u.name as restaurant_name, u.organization_name, u.address, u.phone, u.latitude, u.longitude
      FROM foods f
      JOIN users u ON f.restaurant_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (filters.status) {
      sql += ` AND f.status = $${idx}`;
      params.push(filters.status);
      idx++;
    }

    if (filters.food_type) {
      sql += ` AND f.food_type = $${idx}`;
      params.push(filters.food_type);
      idx++;
    }

    if (filters.search) {
      sql += ` AND (f.food_name ILIKE $${idx} OR f.description ILIKE $${idx})`;
      params.push(`%${filters.search}%`);
      idx++;
    }

    sql += ` ORDER BY f.created_at DESC`;

    const res = await query(sql, params);
    return res.rows;
  }

  static async findNearby(lat: number, lon: number, radiusKm: number = 10): Promise<Food[]> {
    const allFoods = await this.findAll({ status: 'available' });
    return allFoods
      .map(food => {
        if (food.latitude && food.longitude) {
          const dist = getDistance(lat, lon, Number(food.latitude), Number(food.longitude));
          return { ...food, distance: dist };
        }
        return { ...food, distance: 9999 };
      })
      .filter(food => food.distance <= radiusKm)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  static async update(id: number, foodData: Partial<Food>): Promise<Food | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    Object.entries(foodData).forEach(([key, val]) => {
      if (val !== undefined && key !== 'id') {
        // Normalize Date values to strings for sqlite compatibility
        if ((val as any) instanceof Date) {
          if (key === 'pickup_date') {
            val = (val as any as Date).toISOString().split('T')[0];
          } else {
            val = (val as any as Date).toISOString();
          }
        }
        fields.push(`${key} = $${idx}`);
        values.push(val);
        idx++;
      }
    });

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const res = await query(
      `UPDATE foods SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return res.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const res = await query(`DELETE FROM foods WHERE id = $1`, [id]);
    return (res.rowCount || 0) > 0;
  }

  static async getByRestaurant(restaurantId: number): Promise<Food[]> {
    const res = await query(
      `SELECT * FROM foods WHERE restaurant_id = $1 ORDER BY created_at DESC`,
      [restaurantId]
    );
    return res.rows;
  }
}
