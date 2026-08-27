import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { SystemLogModel } from '../models/SystemLog';
import { sendEmail } from '../services/emailService';
import { generateToken } from '../utils/helpers';
import { logError } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_food_rescue_key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

const createSendToken = (user: any, statusCode: number, res: Response) => {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE } as any
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  res.cookie('token', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    user
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, address, role, organization_name, latitude, longitude } = req.body;

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email address already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      role,
      organization_name,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined
    });

    await SystemLogModel.create({
      user_id: user.id,
      action: 'USER_REGISTERED',
      details: { email: user.email, role: user.role },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Send Welcome Email asynchronously
    sendEmail(
      user.email,
      'Welcome to Food Rescue Platform!',
      `Hello ${user.name},\n\nThank you for registering as a ${user.role} on Food Rescue. Together we can end food waste!`
    );

    createSendToken(user, 201, res);
  } catch (error) {
    logError(`Register error: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Internal server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    await SystemLogModel.create({
      user_id: user.id,
      action: 'USER_LOGIN',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });

    createSendToken(user, 200, res);
  } catch (error) {
    logError(`Login error: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, phone, address, organization_name, latitude, longitude } = req.body;
    const updated = await UserModel.update(req.user!.id, {
      name,
      phone,
      address,
      organization_name,
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined
    });

    res.status(200).json({ success: true, message: 'Profile updated successfully', user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await UserModel.findByEmail(req.user!.email);

    if (!user || !(await bcrypt.compare(oldPassword, user.password || ''))) {
      return res.status(400).json({ success: false, message: 'Incorrect old password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.update(req.user!.id, { password: hashedPassword });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error changing password' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findByEmail(email);

    if (!user) {
      return res.status(404).json({ success: false, message: 'No user registered with this email' });
    }

    const resetToken = generateToken(20);
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await UserModel.update(user.id, {
      reset_token: resetToken,
      reset_token_expiry: resetExpiry
    });

    const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${resetToken}`;
    await sendEmail(
      user.email,
      'Password Reset Token - Food Rescue',
      `You requested a password reset. Please use the following link within 1 hour: ${resetUrl}`
    );

    res.status(200).json({ success: true, message: 'Reset password email sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error initiating password reset' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    const user = await UserModel.findByEmail(req.body.email || '');
    if (!user || user.reset_token !== token || !user.reset_token_expiry || new Date(user.reset_token_expiry) < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.update(user.id, {
      password: hashedPassword,
      reset_token: null,
      reset_token_expiry: null
    });

    res.status(200).json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
};
