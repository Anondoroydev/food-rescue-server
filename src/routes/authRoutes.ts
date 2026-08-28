import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateRegister, validateLogin } from '../middleware/validators';
import { getInMemoryUsers } from '../controllers/authController';

const router = Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/mem-users', (_req, res) => {
    try {
      res.json({ success: true, users: getInMemoryUsers() });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Unable to read dev users' });
    }
  });
}

export default router;
