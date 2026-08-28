"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startExpiryCheckerJob = exports.runExpiryChecker = void 0;
const db_1 = require("../config/db");
const logger_1 = require("../utils/logger");
const runExpiryChecker = async () => {
    try {
        (0, logger_1.logInfo)('Running background job: expiryChecker');
        // 1. Mark foods past expiry_time as expired
        const expiredRes = await (0, db_1.query)(`
      UPDATE foods
      SET status = 'expired', updated_at = NOW()
      WHERE expiry_time < NOW() AND status = 'available'
      RETURNING id, food_name
    `);
        if (expiredRes.rowCount && expiredRes.rowCount > 0) {
            (0, logger_1.logInfo)(`Expired ${expiredRes.rowCount} food items: ${expiredRes.rows.map(r => r.food_name).join(', ')}`);
        }
        // 2. Clean up expired foods older than 24 hours
        const cleanupRes = await (0, db_1.query)(`
      DELETE FROM foods
      WHERE status = 'expired' AND updated_at < NOW() - INTERVAL '24 hours'
    `);
        if (cleanupRes.rowCount && cleanupRes.rowCount > 0) {
            (0, logger_1.logInfo)(`Cleaned up ${cleanupRes.rowCount} old expired food items.`);
        }
    }
    catch (error) {
        (0, logger_1.logError)(`expiryChecker background job error: ${error.message}`);
    }
};
exports.runExpiryChecker = runExpiryChecker;
const startExpiryCheckerJob = () => {
    // Run immediately on boot, then every 1 hour (3600000 ms)
    (0, exports.runExpiryChecker)();
    setInterval(exports.runExpiryChecker, 60 * 60 * 1000);
};
exports.startExpiryCheckerJob = startExpiryCheckerJob;
