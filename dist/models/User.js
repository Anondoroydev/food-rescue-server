"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const db_1 = require("../config/db");
class UserModel {
    static async create(userData) {
        const { name, email, password, phone, address, role, organization_name, latitude, longitude, profile_image } = userData;
        const res = await (0, db_1.query)(`INSERT INTO users (name, email, password, phone, address, role, organization_name, latitude, longitude, profile_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`, [name, email, password, phone, address || null, role, organization_name || null, latitude || null, longitude || null, profile_image || null]);
        return res.rows[0];
    }
    static async findByEmail(email) {
        const res = await (0, db_1.query)(`SELECT * FROM users WHERE email = $1`, [email]);
        return res.rows[0] || null;
    }
    static async findById(id) {
        const res = await (0, db_1.query)(`SELECT id, name, email, phone, address, role, organization_name, latitude, longitude, profile_image, is_active, created_at, updated_at FROM users WHERE id = $1`, [id]);
        return res.rows[0] || null;
    }
    static async update(id, userData) {
        const fields = [];
        const values = [];
        let idx = 1;
        Object.entries(userData).forEach(([key, val]) => {
            if (val !== undefined && key !== 'id') {
                fields.push(`${key} = $${idx}`);
                values.push(val);
                idx++;
            }
        });
        if (fields.length === 0)
            return this.findById(id);
        values.push(id);
        const res = await (0, db_1.query)(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);
        return res.rows[0] || null;
    }
    static async delete(id) {
        const res = await (0, db_1.query)(`DELETE FROM users WHERE id = $1`, [id]);
        return (res.rowCount || 0) > 0;
    }
    static async getAll(role) {
        if (role) {
            const res = await (0, db_1.query)(`SELECT id, name, email, phone, address, role, organization_name, latitude, longitude, is_active, created_at FROM users WHERE role = $1 ORDER BY created_at DESC`, [role]);
            return res.rows;
        }
        const res = await (0, db_1.query)(`SELECT id, name, email, phone, address, role, organization_name, latitude, longitude, is_active, created_at FROM users ORDER BY created_at DESC`);
        return res.rows;
    }
    static async getAttendancePercentage(userId) {
        const totalReqs = await (0, db_1.query)(`SELECT COUNT(*) FROM requests WHERE ngo_id = $1`, [userId]);
        const completedReqs = await (0, db_1.query)(`SELECT COUNT(*) FROM requests WHERE ngo_id = $1 AND status = 'collected'`, [userId]);
        const total = parseInt(totalReqs.rows[0].count, 10);
        const completed = parseInt(completedReqs.rows[0].count, 10);
        if (total === 0)
            return 100;
        return parseFloat(((completed / total) * 100).toFixed(1));
    }
}
exports.UserModel = UserModel;
