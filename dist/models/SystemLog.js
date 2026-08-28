"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemLogModel = void 0;
const db_1 = require("../config/db");
class SystemLogModel {
    static async create(logData) {
        const { user_id, action, details, ip_address, user_agent } = logData;
        const res = await (0, db_1.query)(`INSERT INTO system_logs (user_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [user_id || null, action, details ? JSON.stringify(details) : null, ip_address || null, user_agent || null]);
        return res.rows[0];
    }
    static async findAll(limit = 100) {
        const res = await (0, db_1.query)(`SELECT sl.*, u.name as user_name
       FROM system_logs sl
       LEFT JOIN users u ON sl.user_id = u.id
       ORDER BY sl.created_at DESC
       LIMIT $1`, [limit]);
        return res.rows;
    }
    static async delete(id) {
        const res = await (0, db_1.query)(`DELETE FROM system_logs WHERE id = $1`, [id]);
        return (res.rowCount || 0) > 0;
    }
    static async cleanup(daysOld = 30) {
        const res = await (0, db_1.query)(`DELETE FROM system_logs WHERE created_at < datetime('now', '-' || ? || ' days')`, [daysOld]);
        return res.rowCount || 0;
    }
}
exports.SystemLogModel = SystemLogModel;
