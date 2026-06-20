import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models/User';
import { Admin } from '../models/Admin';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: 'user' | 'admin' | 'superadmin';
    is2faVerified?: boolean;
  };
  admin?: {
    id: string;
    role: 'admin' | 'superadmin';
    is2faVerified?: boolean;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    let user = null;
    let admin = null;

    if (decoded.role === 'admin' || decoded.role === 'superadmin') {
      admin = await Admin.findById(decoded.userId);
      // Debug: if admin not found, log masked id & role to help debugging in dev
      const mask = (s: string | undefined | null) => {
        if (!s) return 'none';
        try { return `${s.slice(0, 6)}...${s.slice(-4)}`; } catch { return 'masked'; }
      };
      if (!admin) {
        console.warn('[auth:requireAuth] admin not found for', { id: mask(decoded.userId), role: decoded.role });
        res.status(401).json({ error: 'Admin no longer exists' });
        return;
      }

      if (admin.status === 'suspended') {
        res.status(403).json({ error: 'Your account is suspended' });
        return;
      }

      req.admin = {
        id: decoded.userId,
        role: decoded.role as 'admin' | 'superadmin',
        is2faVerified: decoded.is2faVerified,
      };

      req.user = {
        id: decoded.userId,
        role: decoded.role as 'admin' | 'superadmin',
        is2faVerified: decoded.is2faVerified,
      };

      if (admin.twoFactorEnabled && !decoded.is2faVerified) {
        if (req.path !== '/verify-2fa' && req.path !== '/logout') {
          res.status(403).json({ error: '2FA verification required', code: '2FA_REQUIRED' });
          return;
        }
      }
    } else {
      user = await User.findById(decoded.userId);
      if (!user) {
        res.status(401).json({ error: 'User no longer exists' });
        return;
      }

      if (user.status === 'suspended') {
        res.status(403).json({ error: 'Your account is suspended' });
        return;
      }

      req.user = {
        id: decoded.userId,
        role: decoded.role as 'user' | 'admin' | 'superadmin',
        is2faVerified: decoded.is2faVerified,
      };

      if (user.twoFactorEnabled && !decoded.is2faVerified) {
        if (req.path !== '/verify-2fa' && req.path !== '/logout') {
          res.status(403).json({ error: '2FA verification required', code: '2FA_REQUIRED' });
          return;
        }
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired authorization token' });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    res.status(403).json({ error: 'Access denied: Admin permissions required' });
    return;
  }
  next();
};

export const requireAdminAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const admin = await Admin.findById(decoded.userId);
    if (!admin) {
      res.status(401).json({ error: 'Admin no longer exists' });
      return;
    }

    if (admin.status === 'suspended') {
      res.status(403).json({ error: 'Admin account is suspended' });
      return;
    }

    req.admin = {
      id: decoded.userId,
      role: decoded.role as 'admin' | 'superadmin',
      is2faVerified: decoded.is2faVerified,
    };

    req.user = {
      id: decoded.userId,
      role: decoded.role as 'admin' | 'superadmin',
      is2faVerified: decoded.is2faVerified,
    };

    if (admin.twoFactorEnabled && !decoded.is2faVerified) {
      if (req.path !== '/verify-2fa' && req.path !== '/logout') {
        res.status(403).json({ error: '2FA verification required', code: '2FA_REQUIRED' });
        return;
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired authorization token' });
  }
};
