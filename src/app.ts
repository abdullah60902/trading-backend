import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import routes from './routes';
import { xssClean, csrfCheck, apiRateLimiter } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';
import { env } from './config/env';

const app = express();

// Security Headers (Enforce strict CSP and HSTS)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "res.cloudinary.com"],
      connectSrc: ["'self'", env.CLIENT_URL],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Policy
app.use(
  // Allow the configured client URL and always allow localhost for local dev.
  // Use a function so we can gracefully accept requests without an Origin (server-to-server, curl).
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests with no origin
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        env.CLIENT_URL,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS policy: Origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// Body and Cookie Parsers
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent payload DOS
app.use(cookieParser());

// NoSQL Injection Prevention
app.use(mongoSanitize());

// HTTP Parameter Pollution Prevention
app.use(hpp());

// Anti-XSS and Rate Limiter
app.use(xssClean);
app.use('/api', apiRateLimiter);

// Public CSRF generator endpoint
app.get('/api/v1/csrf-token', (req, res) => {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  
  res.cookie('csrf-token', csrfToken, {
    httpOnly: false, // Accessible by frontend JS to copy into custom request headers
    secure: true, // Always true for cross-origin over HTTPS
    sameSite: 'none', // Always 'none' for cross-origin
    maxAge: 3600000, // 1 hour
  });

  res.status(200).json({ csrfToken });
});

// Protect all write APIs with CSRF checking
app.use('/api/v1', csrfCheck, routes);

// Centralized error handling
app.use(errorHandler);

export default app;
