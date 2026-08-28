"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const db_1 = require("../config/db");
class NotificationModel {
    static async create(notificationData) {
        const { user_id, sender_id, title, message, type, reference_id, reference_type } = notificationData;
        const res = await (0, db_1.query)(`INSERT INTO notifications (user_id, sender_id, title, message, type, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [user_id, sender_id || null, title, message, type, reference_id || null, reference_type || null]);
        return res.rows[0];
    }
    static async findByUser(userId) {
        const res = await (0, db_1.query)(`SELECT n.*, u.name as sender_name
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`, [userId]);
        return res.rows;
    }
    static async markAsRead(id) {
        const res = await (0, db_1.query)(`UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1`, [id]);
        return (res.rowCount || 0) > 0;
    }
    static async markAllAsRead(userId) {
        const res = await (0, db_1.query)(`UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false`, [userId]);
        return (res.rowCount || 0) > 0;
    }
    static async delete(id) {
        const res = await (0, db_1.query)(`DELETE FROM notifications WHERE id = $1`, [id]);
        return (res.rowCount || 0) > 0;
    }
}
exports.NotificationModel = NotificationModel;
