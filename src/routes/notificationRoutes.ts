import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getNotifications);
router.put('/read', authenticate, markAsRead);
router.put('/read-all', authenticate, markAllAsRead);

export default router;
