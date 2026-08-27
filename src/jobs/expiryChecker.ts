import { query } from '../config/db';
import { logInfo, logError } from '../utils/logger';

export const runExpiryChecker = async () => {
  try {
    logInfo('Running background job: expiryChecker');
    // 1. Mark foods past expiry_time as expired
    const expiredRes = await query(`
      UPDATE foods
      SET status = 'expired', updated_at = NOW()
      WHERE expiry_time < NOW() AND status = 'available'
      RETURNING id, food_name
    `);

    if (expiredRes.rowCount && expiredRes.rowCount > 0) {
      logInfo(`Expired ${expiredRes.rowCount} food items: ${expiredRes.rows.map(r => r.food_name).join(', ')}`);
    }

    // 2. Clean up expired foods older than 24 hours
    const cleanupRes = await query(`
      DELETE FROM foods
      WHERE status = 'expired' AND updated_at < NOW() - INTERVAL '24 hours'
    `);

    if (cleanupRes.rowCount && cleanupRes.rowCount > 0) {
      logInfo(`Cleaned up ${cleanupRes.rowCount} old expired food items.`);
    }
  } catch (error) {
    logError(`expiryChecker background job error: ${(error as Error).message}`);
  }
};

export const startExpiryCheckerJob = () => {
  // Run immediately on boot, then every 1 hour (3600000 ms)
  runExpiryChecker();
  setInterval(runExpiryChecker, 60 * 60 * 1000);
};
