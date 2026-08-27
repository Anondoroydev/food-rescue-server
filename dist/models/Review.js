"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewModel = void 0;
const db_1 = require("../config/db");
class ReviewModel {
    static async create(reviewData) {
        const { from_user_id, to_user_id, request_id, rating, comment } = reviewData;
        const res = await (0, db_1.query)(`INSERT INTO reviews (from_user_id, to_user_id, request_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [from_user_id, to_user_id, request_id || null, rating, comment || null]);
        return res.rows[0];
    }
    static async findByUser(userId) {
        const res = await (0, db_1.query)(`SELECT r.*, u.name as to_user_name
       FROM reviews r
       JOIN users u ON r.to_user_id = u.id
       WHERE r.from_user_id = $1
       ORDER BY r.created_at DESC`, [userId]);
        return res.rows;
    }
    static async findByTarget(targetId) {
        const res = await (0, db_1.query)(`SELECT r.*, u.name as from_user_name
       FROM reviews r
       JOIN users u ON r.from_user_id = u.id
       WHERE r.to_user_id = $1
       ORDER BY r.created_at DESC`, [targetId]);
        return res.rows;
    }
    static async getAverageRating(userId) {
        const res = await (0, db_1.query)(`SELECT AVG(rating) as avg_rating FROM reviews WHERE to_user_id = $1`, [userId]);
        const avg = res.rows[0]?.avg_rating;
        return avg ? parseFloat(parseFloat(avg).toFixed(1)) : 5.0;
    }
    static async delete(id) {
        const res = await (0, db_1.query)(`DELETE FROM reviews WHERE id = $1`, [id]);
        return (res.rowCount || 0) > 0;
    }
}
exports.ReviewModel = ReviewModel;
