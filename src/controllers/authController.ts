import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { SystemLogModel } from '../models/SystemLog';
import { sendEmail } from '../services/emailService';
import { generateToken } from '../utils/helpers';
import { logError } from '../utils/logger';
import { getDevUserByEmail, addDevUser, updateDevUser } from '../utils/devStore';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_food_rescue_key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Dev store persistence (local JSON) used when DB is unavailable
export const getInMemoryUsers = () => {
  return (require('../utils/devStore').getDevUsers() || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, is_active: u.is_active }));
};

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
    // Try database first
    try {
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

      try {
        await SystemLogModel.create({
          user_id: user.id,
          action: 'USER_REGISTERED',
          details: { email: user.email, role: user.role },
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
      } catch (_) {}

      // Send Welcome Email asynchronously
      sendEmail(
        user.email,
        'Welcome to Food Rescue Platform!',
        `Hello ${user.name},\n\nThank you for registering as a ${user.role} on Food Rescue. Together we can end food waste!`
      );

      return createSendToken(user, 201, res);
    } catch (dbErr) {
      // DB unavailable: fallback to persistent dev store
      logError(`Database error during register (fallback to dev-store): ${(dbErr as Error).message}`);

      if (getDevUserByEmail(email)) {
        return res.status(400).json({ success: false, message: 'Email address already registered (dev-store)' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        id: -Date.now(),
        name,
        email,
        password: hashedPassword,
        phone,
        address,
        role: role || 'user',
        organization_name,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        is_active: true
      } as any;

      addDevUser(user as any);
      try {
        sendEmail(
          user.email,
          'Welcome to Food Rescue Platform!',
          `Hello ${user.name},\n\nThank you for registering as a ${user.role} on Food Rescue. Together we can end food waste!`
        );
      } catch (_) {}

      return createSendToken(user, 201, res);
    }
  } catch (error) {
    logError(`Register error: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Internal server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    // Try DB lookup first
    try {
      const user = await UserModel.findByEmail(email);
      if (!user) {
        // If not found in DB, check persistent dev store before failing
        const memUser = getDevUserByEmail(email);
        if (!memUser) {
          return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        // treat memUser as the user for the rest of the flow
        if (!memUser.is_active) {
          return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
        }

        const isMatchMem = await bcrypt.compare(password, memUser.password || '');
        if (!isMatchMem) {
          return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        await SystemLogModel.create({
          user_id: memUser.id,
          action: 'DEV_STORE_USER_LOGIN',
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        }).catch(() => {});

        return createSendToken(memUser, 200, res);
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

      return createSendToken(user, 200, res);
    } catch (dbErr) {
      // DB unavailable: try persistent dev store
      logError(`Database error during login (fallback to dev-store): ${(dbErr as Error).message}`);
      const memUser = getDevUserByEmail(email);
      if (!memUser) {
        // DB is unavailable and user not in dev store: treat as auth failure
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (!memUser.is_active) {
        return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
      }

      const isMatch = await bcrypt.compare(password, memUser.password || '');
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      await SystemLogModel.create({
        user_id: memUser.id,
        action: 'DEV_STORE_USER_LOGIN',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }).catch(() => {});

      return createSendToken(memUser, 200, res);
    }
  } catch (error) {
    logError(`Login error: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    // Try DB first
    try {
      const user = await UserModel.findById(req.user!.id);
      if (user) {
        return res.status(200).json({ success: true, user });
      }
      // If not in DB, fall through to dev-store lookup
    } catch (dbErr) {
      // DB unavailable — will attempt dev-store below
    }

    // Dev-store fallback: look up by email from the authenticated token
    try {
      const devUser = (req.user && req.user.email) ? getDevUserByEmail(req.user.email) : undefined;
      if (!devUser) {
        return res.status(404).json({ success: false, message: 'User profile not found' });
      }
      // Remove sensitive fields
      const safe = { ...devUser } as any;
      if (safe.password) delete safe.password;
      return res.status(200).json({ success: true, user: safe });
    } catch (e) {
      return res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, phone, address, organization_name, latitude, longitude } = req.body;
    // Try DB update first
    try {
      const updated = await UserModel.update(req.user!.id, {
        name,
        phone,
        address,
        organization_name,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined
      });
      return res.status(200).json({ success: true, message: 'Profile updated successfully', user: updated });
    } catch (dbErr) {
      // DB unavailable: update dev-store if present
      const email = req.user?.email;
      if (!email) return res.status(500).json({ success: false, message: 'Error updating profile' });
      const updatedDev = updateDevUser(email, {
        name,
        phone,
        address,
        organization_name,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined
      });
      if (!updatedDev) return res.status(500).json({ success: false, message: 'Error updating profile' });
      const safe = { ...updatedDev } as any;
      if (safe.password) delete safe.password;
      return res.status(200).json({ success: true, message: 'Profile updated successfully (dev-store)', user: safe });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    // Try DB first
    try {
      const user = await UserModel.findByEmail(req.user!.email);
      if (!user || !(await bcrypt.compare(oldPassword, user.password || ''))) {
        return res.status(400).json({ success: false, message: 'Incorrect old password' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await UserModel.update(req.user!.id, { password: hashedPassword });

      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (dbErr) {
      // DB unavailable: try dev-store
      logError(`Database error during changePassword (dev fallback): ${(dbErr as Error).message}`);
      const devUser = getDevUserByEmail(req.user!.email);
      if (!devUser) {
        return res.status(500).json({ success: false, message: 'Error changing password' });
      }
      const match = await bcrypt.compare(oldPassword, devUser.password || '');
      if (!match) {
        return res.status(400).json({ success: false, message: 'Incorrect old password' });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      const updated = updateDevUser(devUser.email, { password: hashed });
      if (!updated) return res.status(500).json({ success: false, message: 'Error changing password' });
      return res.status(200).json({ success: true, message: 'Password updated successfully (dev-store)' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error changing password' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    try {
      const user = await UserModel.findByEmail(email);

      if (!user) {
        const devUser = getDevUserByEmail(email);
        if (!devUser) {
          return res.status(404).json({ success: false, message: 'No user registered with this email' });
        }

        const resetToken = generateToken(20);
        const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const updated = updateDevUser(email, {
          reset_token: resetToken,
          reset_token_expiry: resetExpiry
        });

        if (!updated) {
          return res.status(500).json({ success: false, message: 'Error initiating password reset' });
        }

        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${resetToken}`;
        await sendEmail(
          updated.email,
          'Password Reset Token - Food Rescue',
          `You requested a password reset. Please use the following link within 1 hour: ${resetUrl}`
        ).catch(() => undefined);

        return res.status(200).json({ success: true, message: 'Reset password email sent successfully' });
      }

      const resetToken = generateToken(20);
      const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await UserModel.update(user.id, {
        reset_token: resetToken,
        reset_token_expiry: resetExpiry
      });

      const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${resetToken}`;
      await sendEmail(
        user.email,
        'Password Reset Token - Food Rescue',
        `You requested a password reset. Please use the following link within 1 hour: ${resetUrl}`
      ).catch(() => undefined);

      return res.status(200).json({ success: true, message: 'Reset password email sent successfully' });
    } catch (dbErr) {
      logError(`Database error during forgotPassword fallback: ${(dbErr as Error).message}`);
      const devUser = getDevUserByEmail(email);
      if (!devUser) {
        return res.status(404).json({ success: false, message: 'No user registered with this email' });
      }

      const resetToken = generateToken(20);
      const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const updated = updateDevUser(email, {
        reset_token: resetToken,
        reset_token_expiry: resetExpiry
      });

      if (!updated) {
        return res.status(500).json({ success: false, message: 'Error initiating password reset' });
      }

      const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${resetToken}`;
      await sendEmail(
        updated.email,
        'Password Reset Token - Food Rescue',
        `You requested a password reset. Please use the following link within 1 hour: ${resetUrl}`
      ).catch(() => undefined);

      return res.status(200).json({ success: true, message: 'Reset password email sent successfully' });
    }
  } catch (error) {
    logError(`Forgot password error: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Error initiating password reset' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;

    // Validate inputs
    if (!email || !token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, token, and newPassword are required' });
    }

    try {
      const user = await UserModel.findByEmail(email);

      if (!user) {
        const devUser = getDevUserByEmail(email);
        if (!devUser) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!devUser.reset_token) {
          return res.status(400).json({ success: false, message: 'No reset token found for this user' });
        }

        if (devUser.reset_token !== token) {
          return res.status(400).json({ success: false, message: 'Invalid reset token' });
        }

        const expiryDate = new Date(devUser.reset_token_expiry || 0);
        const now = new Date();

        if (expiryDate < now) {
          return res.status(400).json({ success: false, message: 'Reset token expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updated = updateDevUser(email, {
          password: hashedPassword,
          reset_token: null,
          reset_token_expiry: null
        });

        if (!updated) {
          return res.status(500).json({ success: false, message: 'Error resetting password' });
        }

        return res.status(200).json({ success: true, message: 'Password has been reset successfully' });
      }

      if (!user.reset_token) {
        return res.status(400).json({ success: false, message: 'No reset token found for this user' });
      }

      if (user.reset_token !== token) {
        return res.status(400).json({ success: false, message: 'Invalid reset token' });
      }

      if (!user.reset_token_expiry) {
        return res.status(400).json({ success: false, message: 'Token expiry not set' });
      }

      const expiryDate = new Date(user.reset_token_expiry);
      const now = new Date();

      if (expiryDate < now) {
        return res.status(400).json({ success: false, message: `Reset token expired. Token expiry: ${expiryDate.toISOString()}, Current time: ${now.toISOString()}` });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await UserModel.update(user.id, {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null
      });

      return res.status(200).json({ success: true, message: 'Password has been reset successfully' });
    } catch (dbErr) {
      logError(`Database error during resetPassword fallback: ${(dbErr as Error).message}`);
      const devUser = getDevUserByEmail(email);
      if (!devUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (!devUser.reset_token) {
        return res.status(400).json({ success: false, message: 'No reset token found for this user' });
      }

      if (devUser.reset_token !== token) {
        return res.status(400).json({ success: false, message: 'Invalid reset token' });
      }

      const expiryDate = new Date(devUser.reset_token_expiry || 0);
      const now = new Date();

      if (expiryDate < now) {
        return res.status(400).json({ success: false, message: 'Reset token expired' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = updateDevUser(email, {
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null
      });

      if (!updated) {
        return res.status(500).json({ success: false, message: 'Error resetting password' });
      }

      return res.status(200).json({ success: true, message: 'Password has been reset successfully' });
    }
  } catch (error) {
    logError(`Reset password error: ${(error as Error).message}`);
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
};
