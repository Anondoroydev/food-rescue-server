import { query } from '../config/db';
import { createNotification } from '../services/notificationService';
import { sendEmail } from '../services/emailService';
import { logInfo, logError } from '../utils/logger';

export const runReminderSender = async () => {
  try {
    logInfo('Running background job: reminderSender');

    // 1. Remind restaurants for pending requests > 2 hours old
    const pendingRequests = await query(`
      SELECT r.id, f.food_name, f.restaurant_id, u.email as restaurant_email, u.name as restaurant_name
      FROM requests r
      JOIN foods f ON r.food_id = f.id
      JOIN users u ON f.restaurant_id = u.id
      WHERE r.status = 'pending' AND r.created_at < NOW() - INTERVAL '2 hours'
    `);

    for (const reqRow of pendingRequests.rows) {
      await createNotification(
        reqRow.restaurant_id,
        '⏰ Pending Approval Reminder',
        `You have a pending food claim request for "${reqRow.food_name}". Please approve or decline.`,
        'reminder',
        null,
        reqRow.id,
        'request'
      );

      sendEmail(
        reqRow.restaurant_email,
        'Reminder: Pending Claim Request on Food Rescue',
        `Hello ${reqRow.restaurant_name},\n\nYou have an unreviewed claim request for "${reqRow.food_name}". Log in to your dashboard to process it.`
      );
    }

    // 2. Remind NGOs for approved collections pending > 4 hours
    const approvedRequests = await query(`
      SELECT r.id, f.food_name, r.ngo_id, u.email as ngo_email, u.name as ngo_name
      FROM requests r
      JOIN foods f ON r.food_id = f.id
      JOIN users u ON r.ngo_id = u.id
      WHERE r.status = 'approved' AND r.approved_at < NOW() - INTERVAL '4 hours'
    `);

    for (const reqRow of approvedRequests.rows) {
      await createNotification(
        reqRow.ngo_id,
        '⏰ Food Collection Reminder',
        `Your request for "${reqRow.food_name}" is approved! Please proceed with pickup.`,
        'reminder',
        null,
        reqRow.id,
        'request'
      );

      sendEmail(
        reqRow.ngo_email,
        'Reminder: Approved Food Pickup Ready',
        `Hello ${reqRow.ngo_name},\n\nYour food request for "${reqRow.food_name}" was approved and is awaiting collection.`
      );
    }

    logInfo(`Sent reminders for ${pendingRequests.rows.length} pending approvals and ${approvedRequests.rows.length} pending pickups.`);
  } catch (error) {
    logError(`reminderSender background job error: ${(error as Error).message}`);
  }
};

export const startReminderSenderJob = () => {
  // Run immediately, then every 6 hours (21600000 ms)
  runReminderSender();
  setInterval(runReminderSender, 6 * 60 * 60 * 1000);
};
