import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Strict Rate Limiter for Auth Routes (Login, Signup, OTP, 2FA)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// General API Rate Limiter
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // Limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
  },
});

// Simple CSRF validation middleware for POST/PUT/DELETE APIs
// Requires a matching token in cookies and custom header
export const csrfCheck = (req: Request, res: Response, next: NextFunction): void => {
  const method = req.method;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies['csrf-token'];

  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    res.status(403).json({ error: 'CSRF token verification failed' });
    return;
  }

  next();
};

// Custom XSS Sanitizer Middleware (Safe stripping of script tags/HTML injections)
export const xssClean = (req: Request, res: Response, next: NextFunction): void => {
  const sanitize = (data: any): any => {
    if (typeof data === 'string') {
      // Basic HTML entity escaping
      return data
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    if (Array.isArray(data)) {
      return data.map(sanitize);
    }
    if (data && typeof data === 'object') {
      const cleanObj: Record<string, any> = {};
      for (const key in data) {
        cleanObj[key] = sanitize(data[key]);
      }
      return cleanObj;
    }
    return data;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};
