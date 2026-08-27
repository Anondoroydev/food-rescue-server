"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startReminderSenderJob = exports.runReminderSender = void 0;
const db_1 = require("../config/db");
const notificationService_1 = require("../services/notificationService");
const emailService_1 = require("../services/emailService");
const logger_1 = require("../utils/logger");
const runReminderSender = async () => {
    try {
        (0, logger_1.logInfo)('Running background job: reminderSender');
        // 1. Remind restaurants for pending requests > 2 hours old
        const pendingRequests = await (0, db_1.query)(`
      SELECT r.id, f.food_name, f.restaurant_id, u.email as restaurant_email, u.name as restaurant_name
      FROM requests r
      JOIN foods f ON r.food_id = f.id
      JOIN users u ON f.restaurant_id = u.id
      WHERE r.status = 'pending' AND r.created_at < NOW() - INTERVAL '2 hours'
    `);
        for (const reqRow of pendingRequests.rows) {
            await (0, notificationService_1.createNotification)(reqRow.restaurant_id, '⏰ Pending Approval Reminder', `You have a pending food claim request for "${reqRow.food_name}". Please approve or decline.`, 'reminder', null, reqRow.id, 'request');
            (0, emailService_1.sendEmail)(reqRow.restaurant_email, 'Reminder: Pending Claim Request on Food Rescue', `Hello ${reqRow.restaurant_name},\n\nYou have an unreviewed claim request for "${reqRow.food_name}". Log in to your dashboard to process it.`);
        }
        // 2. Remind NGOs for approved collections pending > 4 hours
        const approvedRequests = await (0, db_1.query)(`
      SELECT r.id, f.food_name, r.ngo_id, u.email as ngo_email, u.name as ngo_name
      FROM requests r
      JOIN foods f ON r.food_id = f.id
      JOIN users u ON r.ngo_id = u.id
      WHERE r.status = 'approved' AND r.approved_at < NOW() - INTERVAL '4 hours'
    `);
        for (const reqRow of approvedRequests.rows) {
            await (0, notificationService_1.createNotification)(reqRow.ngo_id, '⏰ Food Collection Reminder', `Your request for "${reqRow.food_name}" is approved! Please proceed with pickup.`, 'reminder', null, reqRow.id, 'request');
            (0, emailService_1.sendEmail)(reqRow.ngo_email, 'Reminder: Approved Food Pickup Ready', `Hello ${reqRow.ngo_name},\n\nYour food request for "${reqRow.food_name}" was approved and is awaiting collection.`);
        }
        (0, logger_1.logInfo)(`Sent reminders for ${pendingRequests.rows.length} pending approvals and ${approvedRequests.rows.length} pending pickups.`);
    }
    catch (error) {
        (0, logger_1.logError)(`reminderSender background job error: ${error.message}`);
    }
};
exports.runReminderSender = runReminderSender;
const startReminderSenderJob = () => {
    // Run immediately, then every 6 hours (21600000 ms)
    (0, exports.runReminderSender)();
    setInterval(exports.runReminderSender, 6 * 60 * 60 * 1000);
};
exports.startReminderSenderJob = startReminderSenderJob;
