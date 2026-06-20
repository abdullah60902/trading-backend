import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import routes from './routes';
import { xssClean, csrfCheck, apiRateLimiter } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';

const app = express();

// Security Headers
app.use(helmet());

// CORS Policy
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// Body and Cookie Parsers
app.use(express.json());
app.use(cookieParser());

// Anti-XSS and Rate Limiter
app.use(xssClean);
app.use('/api', apiRateLimiter);

// Public CSRF generator endpoint
app.get('/api/v1/csrf-token', (req, res) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  
  res.cookie('csrf-token', csrfToken, {
    httpOnly: false, // Accessible by frontend JS to copy into custom request headers
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 3600000, // 1 hour
  });

  res.status(200).json({ csrfToken });
});

// Protect all write APIs with CSRF checking
app.use('/api/v1', csrfCheck, routes);

// Centralized error handling
app.use(errorHandler);

export default app;
