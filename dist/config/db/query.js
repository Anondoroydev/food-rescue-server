"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = void 0;
const pool_1 = require("./pool");
const logger_1 = require("../../utils/logger");
const query = async (text, params = []) => {
    try {
        const res = await pool_1.pool.query(text, params);
        return { rows: res.rows, rowCount: res.rowCount || res.rows.length };
    }
    catch (err) {
        (0, logger_1.logError)(`PostgreSQL query error: ${err.message} | SQL: ${text}`);
        throw err;
    }
};
exports.query = query;
