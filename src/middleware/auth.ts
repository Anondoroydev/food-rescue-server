import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { UserRole, ExpressUserPayload } from '../types';
import { logError } from '../utils/logger';
import { getDevUserByEmail } from '../utils/devStore';

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
      // For API routes prefer JSON responses — only redirect for non-API HTML page requests
      const isApiRequest = typeof req.originalUrl === 'string' && req.originalUrl.startsWith('/api');
      if (req.accepts('html') && !isApiRequest) {
        return res.redirect('/auth/login');
      }
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as ExpressUserPayload;

    try {
      let userResult = await query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [decoded.id]);
      
      if (userResult.rows.length === 0 && decoded.email) {
        userResult = await query('SELECT id, name, email, role, is_active FROM users WHERE email = $1', [decoded.email]);
      }

      if (userResult.rows.length === 0) {
        // Not found in primary DB, try dev-store by email
        const devUser = decoded.email ? getDevUserByEmail(decoded.email) : undefined;
        if (!devUser) {
          return res.status(401).json({ success: false, message: 'User no longer exists' });
        }
        if (devUser.is_active === false) {
          return res.status(403).json({ success: false, message: 'User account is deactivated' });
        }

        // Auto-sync devUser into SQLite users table so foreign keys work
        try {
          const insertRes = await query(
            `INSERT INTO users (name, email, password, phone, address, role, organization_name, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
              devUser.name,
              devUser.email,
              devUser.password || 'devpass123',
              devUser.phone || '0000000000',
              devUser.address || null,
              devUser.role || 'restaurant',
              devUser.organization_name || null,
              devUser.latitude || null,
              devUser.longitude || null
            ]
          );
          if (insertRes.rows.length > 0) {
            const synced = insertRes.rows[0];
            req.user = {
              id: synced.id,
              name: synced.name,
              email: synced.email,
              role: synced.role as UserRole
            };
            return next();
          }
        } catch (_) {
          const byEmail = await query('SELECT id, name, email, role, is_active FROM users WHERE email = $1', [devUser.email]);
          if (byEmail.rows.length > 0) {
            const u = byEmail.rows[0];
            req.user = {
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role as UserRole
            };
            return next();
          }
        }

        req.user = {
          id: devUser.id as any,
          name: devUser.name,
          email: devUser.email,
          role: devUser.role as UserRole
        };
        return next();
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

      return next();
    } catch (dbErr) {
      // DB unavailable: try dev-store fallback using token payload
      logError(`Database error during authenticate: ${(dbErr as Error).message}`);
      const devUser = decoded.email ? getDevUserByEmail(decoded.email) : undefined;
      if (!devUser) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
      }
      if (devUser.is_active === false) {
        return res.status(403).json({ success: false, message: 'User account is deactivated' });
      }
      req.user = {
        id: devUser.id as any,
        name: devUser.name,
        email: devUser.email,
        role: devUser.role as UserRole
      };
      return next();
    }
  } catch (error) {
    const isApiRequest = typeof req.originalUrl === 'string' && req.originalUrl.startsWith('/api');
    if (req.accepts('html') && !isApiRequest) {
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
