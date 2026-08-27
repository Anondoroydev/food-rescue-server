import { Router } from 'express';
import {
  getDashboard,
  getAllUsers,
  blockUser,
  unblockUser,
  getReports,
  getStats
} from '../controllers/adminController';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, isAdmin, getDashboard);
router.get('/users', authenticate, isAdmin, getAllUsers);
router.put('/users/:id/block', authenticate, isAdmin, blockUser);
router.put('/users/:id/unblock', authenticate, isAdmin, unblockUser);
router.get('/reports', authenticate, isAdmin, getReports);
router.get('/stats', authenticate, isAdmin, getStats);

export default router;
