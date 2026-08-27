import { Router } from 'express';
import {
  createRequest,
  getMyRequests,
  approveRequest,
  rejectRequest,
  collectFood,
  getQRCode
} from '../controllers/requestController';
import { authenticate, isNGO, isRestaurant } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, isNGO, createRequest);
router.get('/my', authenticate, isNGO, getMyRequests);
router.put('/:id/approve', authenticate, isRestaurant, approveRequest);
router.put('/:id/reject', authenticate, isRestaurant, rejectRequest);
router.put('/:id/collect', authenticate, isNGO, collectFood);
router.get('/:id/qr', authenticate, isNGO, getQRCode);

export default router;
