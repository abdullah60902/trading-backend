"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const security_1 = require("../middleware/security");
const validation_1 = require("../middleware/validation");
const validators_1 = require("../utils/validators");
const router = (0, express_1.Router)();
// Rate limited public auth routes
router.post('/signup', security_1.authRateLimiter, (0, validation_1.validate)(validators_1.signupSchema), authController_1.signup);
router.post('/verify-email', security_1.authRateLimiter, (0, validation_1.validate)(validators_1.verifyEmailSchema), authController_1.verifyEmail);
router.post('/resend-verification', security_1.authRateLimiter, authController_1.resendVerificationEmail);
router.post('/login', security_1.authRateLimiter, (0, validation_1.validate)(validators_1.loginSchema), authController_1.login);
router.post('/forgot-password', security_1.authRateLimiter, (0, validation_1.validate)(validators_1.forgotPasswordSchema), authController_1.forgotPassword);
router.post('/reset-password', security_1.authRateLimiter, (0, validation_1.validate)(validators_1.resetPasswordSchema), authController_1.resetPassword);
router.post('/refresh', authController_1.refreshToken);
// Require authentication for these
router.get('/me', auth_1.requireAuth, authController_1.getMe);
router.post('/logout', auth_1.requireAuth, authController_1.logout);
// Mobile Verification
router.post('/send-mobile-otp', auth_1.requireAuth, authController_1.sendMobileVerificationOtp);
router.post('/verify-mobile-otp', auth_1.requireAuth, (0, validation_1.validate)(validators_1.verifyMobileSchema), authController_1.verifyMobileOtp);
// Two-Factor Authentication (2FA)
router.post('/verify-2fa', auth_1.requireAuth, (0, validation_1.validate)(validators_1.verify2faSchema), authController_1.verifyLogin2fa);
router.post('/2fa/setup', auth_1.requireAuth, authController_1.setup2FA);
router.post('/2fa/confirm', auth_1.requireAuth, (0, validation_1.validate)(validators_1.verify2faSchema), authController_1.confirm2FA);
router.post('/2fa/disable', auth_1.requireAuth, (0, validation_1.validate)(validators_1.verify2faSchema), authController_1.disable2FA);
exports.default = router;
