"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = void 0;
const db_1 = require("../config/db");
const socketService_1 = require("./socketService");
const logger_1 = require("../utils/logger");
const createNotification = async (userId, title, message, type, senderId, referenceId, referenceType) => {
    try {
        const res = await (0, db_1.query)(`INSERT INTO notifications (user_id, sender_id, title, message, type, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [userId, senderId || null, title, message, type, referenceId || null, referenceType || null]);
        const notification = res.rows[0];
        try {
            const io = (0, socketService_1.getIO)();
            io.to(`user_${userId}`).emit('new_notification', notification);
        }
        catch (e) {
            // Socket might not be initialized during test runs
        }
        return notification;
    }
    catch (error) {
        (0, logger_1.logError)(`Failed to create notification for user #${userId}: ${error.message}`);
        throw error;
    }
};
exports.createNotification = createNotification;
