import { Router } from 'express';
import { downloadPDF } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/download', authenticate, downloadPDF);

export default router;
