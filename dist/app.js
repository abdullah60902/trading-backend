"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const crypto_1 = __importDefault(require("crypto"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const hpp_1 = __importDefault(require("hpp"));
const routes_1 = __importDefault(require("./routes"));
const security_1 = require("./middleware/security");
const errorHandler_1 = require("./middleware/errorHandler");
const env_1 = require("./config/env");
const app = (0, express_1.default)();
// Security Headers (Enforce strict CSP and HSTS)
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "res.cloudinary.com"],
            connectSrc: ["'self'", env_1.env.CLIENT_URL],
        },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// CORS Policy
app.use(
// Allow the configured client URL and always allow localhost for local dev.
// Use a function so we can gracefully accept requests without an Origin (server-to-server, curl).
(0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow non-browser requests with no origin
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            env_1.env.CLIENT_URL,
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
}));
// Body and Cookie Parsers
app.use(express_1.default.json({ limit: '10kb' })); // Limit body size to prevent payload DOS
app.use((0, cookie_parser_1.default)());
// NoSQL Injection Prevention
app.use((0, express_mongo_sanitize_1.default)());
// HTTP Parameter Pollution Prevention
app.use((0, hpp_1.default)());
// Anti-XSS and Rate Limiter
app.use(security_1.xssClean);
app.use('/api', security_1.apiRateLimiter);
// Public CSRF generator endpoint
app.get('/api/v1/csrf-token', (req, res) => {
    const csrfToken = crypto_1.default.randomBytes(32).toString('hex');
    res.cookie('csrf-token', csrfToken, {
        httpOnly: false, // Accessible by frontend JS to copy into custom request headers
        secure: true, // Always true for cross-origin over HTTPS
        sameSite: 'none', // Always 'none' for cross-origin
        maxAge: 3600000, // 1 hour
    });
    res.status(200).json({ csrfToken });
});
// Protect all write APIs with CSRF checking
app.use('/api/v1', security_1.csrfCheck, routes_1.default);
// Centralized error handling
app.use(errorHandler_1.errorHandler);
exports.default = app;
