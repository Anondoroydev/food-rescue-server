import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { UserRole, ExpressUserPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_food_rescue_key';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      if (req.accepts('html')) {
        return res.redirect('/auth/login');
      }
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as ExpressUserPayload;
    
    const userResult = await query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [decoded.id]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'User account is deactivated' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole
    };

    next();
  } catch (error) {
    if (req.accepts('html')) {
      return res.redirect('/auth/login');
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

export const isRestaurant = authorize('restaurant');
export const isNGO = authorize('ngo');
export const isAdmin = authorize('admin');
