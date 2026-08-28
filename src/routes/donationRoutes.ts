import { Router } from 'express';
import { getDonations, getDonationStats } from '../controllers/donationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getDonations);
router.get('/stats', authenticate, getDonationStats);

export default router;
