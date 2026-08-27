import { query } from '../config/db';
import { getIO } from './socketService';
import { NotificationType } from '../types';
import { logError } from '../utils/logger';

export const createNotification = async (
  userId: number,
  title: string,
  message: string,
  type: NotificationType,
  senderId?: number | null,
  referenceId?: number | null,
  referenceType?: string | null
) => {
  try {
    const res = await query(
      `INSERT INTO notifications (user_id, sender_id, title, message, type, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, senderId || null, title, message, type, referenceId || null, referenceType || null]
    );

    const notification = res.rows[0];

    try {
      const io = getIO();
      io.to(`user_${userId}`).emit('new_notification', notification);
    } catch (e) {
      // Socket might not be initialized during test runs
    }

    return notification;
  } catch (error) {
    logError(`Failed to create notification for user #${userId}: ${(error as Error).message}`);
    throw error;
  }
};
