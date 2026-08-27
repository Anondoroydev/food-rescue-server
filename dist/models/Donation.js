"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationModel = void 0;
const db_1 = require("../config/db");
class DonationModel {
    static async create(donationData) {
        const { food_id, restaurant_id, ngo_id, request_id, quantity, notes, status } = donationData;
        const res = await (0, db_1.query)(`INSERT INTO donations (food_id, restaurant_id, ngo_id, request_id, quantity, notes, status, collected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`, [food_id, restaurant_id, ngo_id, request_id || null, quantity, notes || null, status || 'collected']);
        return res.rows[0];
    }
    static async findById(id) {
        const res = await (0, db_1.query)(`SELECT d.*, f.food_name, u1.name as restaurant_name, u2.name as ngo_name
       FROM donations d
       JOIN foods f ON d.food_id = f.id
       JOIN users u1 ON d.restaurant_id = u1.id
       JOIN users u2 ON d.ngo_id = u2.id
       WHERE d.id = $1`, [id]);
        return res.rows[0] || null;
    }
    static async findByRestaurant(restaurantId) {
        const res = await (0, db_1.query)(`SELECT d.*, f.food_name, u.name as ngo_name, u.organization_name as ngo_organization
       FROM donations d
       JOIN foods f ON d.food_id = f.id
       JOIN users u ON d.ngo_id = u.id
       WHERE d.restaurant_id = $1
       ORDER BY d.created_at DESC`, [restaurantId]);
        return res.rows;
    }
    static async findByNGO(ngoId) {
        const res = await (0, db_1.query)(`SELECT d.*, f.food_name, u.name as restaurant_name, u.organization_name as restaurant_organization
       FROM donations d
       JOIN foods f ON d.food_id = f.id
       JOIN users u ON d.restaurant_id = u.id
       WHERE d.ngo_id = $1
       ORDER BY d.created_at DESC`, [ngoId]);
        return res.rows;
    }
    static async updateStatus(id, status) {
        let timestampField = '';
        if (status === 'delivered')
            timestampField = ', delivered_at = NOW()';
        const res = await (0, db_1.query)(`UPDATE donations SET status = $1 ${timestampField} WHERE id = $2 RETURNING *`, [status, id]);
        return res.rows[0] || null;
    }
    static async getStats() {
        const totalDonationsRes = await (0, db_1.query)(`SELECT COUNT(*) FROM donations WHERE status != 'cancelled'`);
        const totalFoodsRes = await (0, db_1.query)(`SELECT COUNT(*) FROM foods WHERE status = 'collected'`);
        const activeRestRes = await (0, db_1.query)(`SELECT COUNT(DISTINCT restaurant_id) FROM foods`);
        const activeNgoRes = await (0, db_1.query)(`SELECT COUNT(DISTINCT ngo_id) FROM requests`);
        return {
            totalDonations: parseInt(totalDonationsRes.rows[0].count, 10),
            totalMealsSaved: parseInt(totalFoodsRes.rows[0].count, 10) * 15, // Estimate 15 meals per donation
            activeRestaurants: parseInt(activeRestRes.rows[0].count, 10),
            activeNGOs: parseInt(activeNgoRes.rows[0].count, 10)
        };
    }
}
exports.DonationModel = DonationModel;
