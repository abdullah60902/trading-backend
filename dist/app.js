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
const routes_1 = __importDefault(require("./routes"));
const security_1 = require("./middleware/security");
const errorHandler_1 = require("./middleware/errorHandler");
const env_1 = require("./config/env");
const app = (0, express_1.default)();
// Security Headers
app.use((0, helmet_1.default)());
// CORS Policy
app.use((0, cors_1.default)({
    origin: env_1.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));
// Body and Cookie Parsers
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Anti-XSS and Rate Limiter
app.use(security_1.xssClean);
app.use('/api', security_1.apiRateLimiter);
// Public CSRF generator endpoint
app.get('/api/v1/csrf-token', (req, res) => {
    const csrfToken = crypto_1.default.randomBytes(32).toString('hex');
    res.cookie('csrf-token', csrfToken, {
        httpOnly: false, // Accessible by frontend JS to copy into custom request headers
        secure: env_1.env.NODE_ENV === 'production',
        sameSite: env_1.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 3600000, // 1 hour
    });
    res.status(200).json({ csrfToken });
});
// Protect all write APIs with CSRF checking
app.use('/api/v1', security_1.csrfCheck, routes_1.default);
// Centralized error handling
app.use(errorHandler_1.errorHandler);
exports.default = app;
