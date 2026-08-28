"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QRCodeModel = void 0;
const db_1 = require("../config/db");
class QRCodeModel {
    static async create(qrData) {
        const { request_id, qr_code, token, expiry_at } = qrData;
        const res = await (0, db_1.query)(`INSERT INTO qr_codes (request_id, qr_code, token, expiry_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [request_id, qr_code, token, expiry_at || null]);
        return res.rows[0];
    }
    static async findByToken(token) {
        const res = await (0, db_1.query)(`SELECT * FROM qr_codes WHERE token = $1`, [token]);
        return res.rows[0] || null;
    }
    static async findByRequest(requestId) {
        const res = await (0, db_1.query)(`SELECT * FROM qr_codes WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1`, [requestId]);
        return res.rows[0] || null;
    }
    static async markAsUsed(id) {
        const res = await (0, db_1.query)(`UPDATE qr_codes SET is_used = true, used_at = NOW() WHERE id = $1`, [id]);
        return (res.rowCount || 0) > 0;
    }
    static async delete(id) {
        const res = await (0, db_1.query)(`DELETE FROM qr_codes WHERE id = $1`, [id]);
        return (res.rowCount || 0) > 0;
    }
    static async getExpired() {
        const res = await (0, db_1.query)(`SELECT * FROM qr_codes WHERE expiry_at < NOW() AND is_used = false`);
        return res.rows;
    }
}
exports.QRCodeModel = QRCodeModel;
