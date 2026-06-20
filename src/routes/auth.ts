import { Router } from 'express';
import {
  signup,
  verifyEmail,
  resendVerificationEmail,
  sendMobileVerificationOtp,
  verifyMobileOtp,
  login,
  verifyLogin2fa,
  setup2FA,
  confirm2FA,
  disable2FA,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getMe,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/security';
import { validate } from '../middleware/validation';
import {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  verifyMobileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verify2faSchema,
} from '../utils/validators';

const router = Router();

// Rate limited public auth routes
router.post('/signup', authRateLimiter, validate(signupSchema), signup);
router.post('/verify-email', authRateLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', authRateLimiter, resendVerificationEmail);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/refresh', refreshToken);

// Require authentication for these
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

// Mobile Verification
router.post('/send-mobile-otp', requireAuth, sendMobileVerificationOtp);
router.post('/verify-mobile-otp', requireAuth, validate(verifyMobileSchema), verifyMobileOtp);

// Two-Factor Authentication (2FA)
router.post('/verify-2fa', requireAuth, validate(verify2faSchema), verifyLogin2fa);
router.post('/2fa/setup', requireAuth, setup2FA);
router.post('/2fa/confirm', requireAuth, validate(verify2faSchema), confirm2FA);
router.post('/2fa/disable', requireAuth, validate(verify2faSchema), disable2FA);

export default router;
