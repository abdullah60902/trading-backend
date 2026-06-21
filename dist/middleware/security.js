"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xssClean = exports.csrfCheck = exports.apiRateLimiter = exports.authRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Strict Rate Limiter for Auth Routes (Login, Signup, OTP, 2FA)
exports.authRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 15 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
});
// General API Rate Limiter
exports.apiRateLimiter = (0, express_rate_limit_1.default)({
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
const csrfCheck = (req, res, next) => {
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
exports.csrfCheck = csrfCheck;
// Custom XSS Sanitizer Middleware (Safe stripping of script tags/HTML injections)
const xssClean = (req, res, next) => {
    const sanitize = (data) => {
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
            const cleanObj = {};
            for (const key in data) {
                cleanObj[key] = sanitize(data[key]);
            }
            return cleanObj;
        }
        return data;
    };
    if (req.body)
        req.body = sanitize(req.body);
    if (req.query)
        req.query = sanitize(req.query);
    if (req.params)
        req.params = sanitize(req.params);
    next();
};
exports.xssClean = xssClean;
