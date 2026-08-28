import { Router } from 'express';
import { getChatHistory, sendMessage } from '../controllers/chatController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/:userId', authenticate, getChatHistory);
router.post('/', authenticate, sendMessage);

export default router;
