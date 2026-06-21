"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminAuth = exports.requireAdmin = exports.requireAuth = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = require("../models/User");
const Admin_1 = require("../models/Admin");
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authorization token required' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        let user = null;
        let admin = null;
        if (decoded.role === 'admin' || decoded.role === 'superadmin') {
            admin = await Admin_1.Admin.findById(decoded.userId);
            // Debug: if admin not found, log masked id & role to help debugging in dev
            const mask = (s) => {
                if (!s)
                    return 'none';
                try {
                    return `${s.slice(0, 6)}...${s.slice(-4)}`;
                }
                catch {
                    return 'masked';
                }
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
                role: decoded.role,
                is2faVerified: decoded.is2faVerified,
            };
            req.user = {
                id: decoded.userId,
                role: decoded.role,
                is2faVerified: decoded.is2faVerified,
            };
            if (admin.twoFactorEnabled && !decoded.is2faVerified) {
                if (req.path !== '/verify-2fa' && req.path !== '/logout') {
                    res.status(403).json({ error: '2FA verification required', code: '2FA_REQUIRED' });
                    return;
                }
            }
        }
        else {
            user = await User_1.User.findById(decoded.userId);
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
                role: decoded.role,
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
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired authorization token' });
    }
};
exports.requireAuth = requireAuth;
const requireAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
        res.status(403).json({ error: 'Access denied: Admin permissions required' });
        return;
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireAdminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authorization token required' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        const admin = await Admin_1.Admin.findById(decoded.userId);
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
            role: decoded.role,
            is2faVerified: decoded.is2faVerified,
        };
        req.user = {
            id: decoded.userId,
            role: decoded.role,
            is2faVerified: decoded.is2faVerified,
        };
        if (admin.twoFactorEnabled && !decoded.is2faVerified) {
            if (req.path !== '/verify-2fa' && req.path !== '/logout') {
                res.status(403).json({ error: '2FA verification required', code: '2FA_REQUIRED' });
                return;
            }
        }
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired authorization token' });
    }
};
exports.requireAdminAuth = requireAdminAuth;
