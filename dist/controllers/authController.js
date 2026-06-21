"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.logout = exports.refreshToken = exports.resetPassword = exports.forgotPassword = exports.disable2FA = exports.confirm2FA = exports.setup2FA = exports.verifyLogin2fa = exports.login = exports.verifyMobileOtp = exports.sendMobileVerificationOtp = exports.resendVerificationEmail = exports.verifyEmail = exports.signup = void 0;
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const Admin_1 = require("../models/Admin");
const Wallet_1 = require("../models/Wallet");
const UserLog_1 = require("../models/UserLog");
const jwt_1 = require("../utils/jwt");
const twoFactor_1 = require("../utils/twoFactor");
const mailer_1 = require("../utils/mailer");
const sms_1 = require("../utils/sms");
const env_1 = require("../config/env");
// Helper to log user activity
const logUserActivity = async (userId, action, req) => {
    try {
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        // Simple device detector
        let deviceInfo = 'Desktop';
        if (/mobile/i.test(userAgent))
            deviceInfo = 'Mobile';
        else if (/tablet/i.test(userAgent))
            deviceInfo = 'Tablet';
        await UserLog_1.UserLog.create({
            userId,
            action,
            ipAddress,
            userAgent,
            deviceInfo,
            location: 'Local Network', // Mock geo-location
        });
    }
    catch (error) {
        console.error('Failed to write user log:', error);
    }
};
// Signup Controller
const signup = async (req, res) => {
    try {
        const { email, password, firstName, lastName, phoneNumber, referralCode } = req.body;
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }
        if (phoneNumber) {
            const existingPhone = await User_1.User.findOne({ phoneNumber });
            if (existingPhone) {
                res.status(400).json({ error: 'Phone number already registered' });
                return;
            }
        }
        // Generate unique referral code for the new user
        let userReferralCode = '';
        let codeExists = true;
        while (codeExists) {
            userReferralCode = crypto_1.default.randomBytes(4).toString('hex').toUpperCase();
            const existing = await User_1.User.findOne({ referralCode: userReferralCode });
            if (!existing) {
                codeExists = false;
            }
        }
        // Process referral hierarchy
        const newUserId = new mongoose_1.default.Types.ObjectId();
        let referredByObjId = undefined;
        let computedReferralPath = `,${newUserId.toString()},`;
        if (referralCode) {
            const sponsor = await User_1.User.findOne({ referralCode });
            if (!sponsor) {
                res.status(400).json({ error: 'Invalid referral code' });
                return;
            }
            referredByObjId = sponsor._id;
            computedReferralPath = `${sponsor.referralPath}${newUserId.toString()},`;
        }
        // Generate Verification Token
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        const user = new User_1.User({
            _id: newUserId,
            email,
            password,
            firstName,
            lastName,
            phoneNumber,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: verificationExpires,
            status: 'pending',
            referralCode: userReferralCode,
            referredBy: referredByObjId,
            referralPath: computedReferralPath,
        });
        await user.save();
        // Create default wallets: USD, BTC, ETH, USDT
        const currencies = ['USD', 'BTC', 'ETH', 'USDT'];
        for (const currency of currencies) {
            // Generate standard mock crypto address
            const prefix = currency === 'BTC' ? 'bc1' : currency === 'ETH' || currency === 'USDT' ? '0x' : 'usd_';
            const address = prefix + crypto_1.default.randomBytes(20).toString('hex');
            // Let's seed USD wallet with $1000.00 mock money for demo, others with 0
            const initialBalance = currency === 'USD' ? 1000.00 : 0.00;
            await Wallet_1.Wallet.create({
                userId: user._id,
                currency,
                mainBalance: initialBalance,
                depositBalance: 0.00,
                earningsBalance: 0.00,
                withdrawalBalance: 0.00,
                lockedBalance: 0.00,
                depositAddress: address,
            });
        }
        // Send Verification Email
        await (0, mailer_1.sendVerificationEmail)(user.email, verificationToken);
        // Audit log
        await logUserActivity(user._id.toString(), 'ACCOUNT_CREATED', req);
        res.status(201).json({
            message: 'Signup successful. Please check your email to verify your account.',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isEmailVerified: false,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Signup failed. Please try again later.' });
    }
};
exports.signup = signup;
// Email Verification Controller
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User_1.User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() },
        });
        if (!user) {
            res.status(400).json({ error: 'Invalid or expired verification token' });
            return;
        }
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        // If user verification rules say we are ready to activate:
        user.status = 'active';
        await user.save();
        await logUserActivity(user._id.toString(), 'EMAIL_VERIFIED', req);
        res.status(200).json({ message: 'Email verified successfully! You can now log in.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Email verification failed.' });
    }
};
exports.verifyEmail = verifyEmail;
// Resend Verification Email Controller
const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }
        const user = await User_1.User.findOne({ email });
        if (!user) {
            // Security: don't reveal if email exists
            res.status(200).json({ message: 'If this email is registered, a new verification link has been sent.' });
            return;
        }
        if (user.isEmailVerified) {
            res.status(400).json({ error: 'This email is already verified. Please log in.' });
            return;
        }
        // Generate a fresh verification token
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = verificationExpires;
        await user.save();
        await (0, mailer_1.sendVerificationEmail)(user.email, verificationToken);
        await logUserActivity(user._id.toString(), 'VERIFICATION_EMAIL_RESENT', req);
        res.status(200).json({ message: 'If this email is registered, a new verification link has been sent.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to resend verification email.' });
    }
};
exports.resendVerificationEmail = resendVerificationEmail;
// Mobile verification OTP trigger
const sendMobileVerificationOtp = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await User_1.User.findById(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        if (!user.phoneNumber) {
            res.status(400).json({ error: 'Please update your phone number first' });
            return;
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        user.mobileOtp = otp;
        user.mobileOtpExpires = otpExpires;
        await user.save();
        await (0, sms_1.sendMobileOtp)(user.phoneNumber, otp);
        await logUserActivity(user._id.toString(), 'MOBILE_OTP_SENT', req);
        res.status(200).json({ message: 'OTP sent successfully to your mobile number.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to send OTP.' });
    }
};
exports.sendMobileVerificationOtp = sendMobileVerificationOtp;
// Verify Mobile OTP Controller
const verifyMobileOtp = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { otp } = req.body;
        const user = await User_1.User.findOne({
            _id: userId,
            mobileOtp: otp,
            mobileOtpExpires: { $gt: new Date() },
        });
        if (!user) {
            res.status(400).json({ error: 'Invalid or expired OTP' });
            return;
        }
        user.isMobileVerified = true;
        user.mobileOtp = undefined;
        user.mobileOtpExpires = undefined;
        await user.save();
        await logUserActivity(user._id.toString(), 'MOBILE_VERIFIED', req);
        res.status(200).json({ message: 'Mobile number verified successfully!' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to verify mobile OTP.' });
    }
};
exports.verifyMobileOtp = verifyMobileOtp;
// Login Controller
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.User.findOne({ email });
        if (!user) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        if (user.status === 'suspended') {
            res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
            return;
        }
        if (!user.isEmailVerified) {
            res.status(403).json({ error: 'Please verify your email before logging in.' });
            return;
        }
        // Check if 2FA is active
        if (user.twoFactorEnabled) {
            // Issue a temp/pre-auth token containing userId only
            const tempToken = (0, jwt_1.generateAccessToken)({
                userId: user._id.toString(),
                role: user.role,
                is2faVerified: false,
            });
            await logUserActivity(user._id.toString(), 'LOGIN_2FA_CHALLENGE', req);
            res.status(200).json({
                twoFactorRequired: true,
                tempToken,
                user: {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                },
            });
            return;
        }
        // Generate standard Access & Refresh Tokens
        const accessToken = (0, jwt_1.generateAccessToken)({
            userId: user._id.toString(),
            role: user.role,
            is2faVerified: false, // 2FA is off
        });
        const refreshToken = (0, jwt_1.generateRefreshToken)({ userId: user._id.toString() });
        user.refreshToken = refreshToken;
        await user.save();
        // Set Refresh Token in cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        // Device Login Tracking Log
        await logUserActivity(user._id.toString(), 'LOGIN_SUCCESS', req);
        res.status(200).json({
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isMobileVerified: user.isMobileVerified,
                twoFactorEnabled: false,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Login failed. Please try again later.' });
    }
};
exports.login = login;
// 2FA login verification
const verifyLogin2fa = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { token } = req.body;
        const user = await User_1.User.findById(userId);
        if (!user || !user.twoFactorSecret) {
            res.status(400).json({ error: 'User or 2FA setup not found' });
            return;
        }
        const isValid = (0, twoFactor_1.verifyTwoFactorToken)(user.twoFactorSecret, token);
        if (!isValid) {
            res.status(400).json({ error: 'Invalid 2FA token' });
            return;
        }
        // 2FA is validated successfully, issue fully approved Access/Refresh token
        const accessToken = (0, jwt_1.generateAccessToken)({
            userId: user._id.toString(),
            role: user.role,
            is2faVerified: true,
        });
        const refreshToken = (0, jwt_1.generateRefreshToken)({ userId: user._id.toString() });
        user.refreshToken = refreshToken;
        await user.save();
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: env_1.env.NODE_ENV === 'production',
            sameSite: env_1.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        await logUserActivity(user._id.toString(), 'LOGIN_2FA_SUCCESS', req);
        res.status(200).json({
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isMobileVerified: user.isMobileVerified,
                twoFactorEnabled: true,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: '2FA verification failed.' });
    }
};
exports.verifyLogin2fa = verifyLogin2fa;
// Setup 2FA (enable request - generates QR code)
const setup2FA = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await User_1.User.findById(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const { secret, qrCodeUrl } = await (0, twoFactor_1.generateTwoFactorSecret)(user.email);
        // Temp save secret, but do not set twoFactorEnabled=true yet until verified
        user.twoFactorSecret = secret;
        await user.save();
        res.status(200).json({ secret, qrCodeUrl });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to generate 2FA secret.' });
    }
};
exports.setup2FA = setup2FA;
// Confirm 2FA setup (Verify first token to enable)
const confirm2FA = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { token } = req.body;
        const user = await User_1.User.findById(userId);
        if (!user || !user.twoFactorSecret) {
            res.status(400).json({ error: 'Please set up 2FA secret first.' });
            return;
        }
        const isValid = (0, twoFactor_1.verifyTwoFactorToken)(user.twoFactorSecret, token);
        if (!isValid) {
            res.status(400).json({ error: 'Invalid 2FA token. Please check your authenticator app.' });
            return;
        }
        user.twoFactorEnabled = true;
        await user.save();
        await logUserActivity(user._id.toString(), '2FA_ENABLED', req);
        res.status(200).json({ message: '2FA enabled successfully!' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to confirm 2FA.' });
    }
};
exports.confirm2FA = confirm2FA;
// Disable 2FA
const disable2FA = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { token } = req.body;
        const user = await User_1.User.findById(userId);
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            res.status(400).json({ error: '2FA is not enabled on this account.' });
            return;
        }
        const isValid = (0, twoFactor_1.verifyTwoFactorToken)(user.twoFactorSecret, token);
        if (!isValid) {
            res.status(400).json({ error: 'Invalid 2FA token.' });
            return;
        }
        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        await user.save();
        await logUserActivity(user._id.toString(), '2FA_DISABLED', req);
        res.status(200).json({ message: '2FA disabled successfully.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to disable 2FA.' });
    }
};
exports.disable2FA = disable2FA;
// Forgot Password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User_1.User.findOne({ email });
        if (!user) {
            // Security practice: do not leak if email exists
            res.status(200).json({ message: 'If that email exists, we have sent a reset password link.' });
            return;
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        user.emailVerificationToken = resetToken; // Reuse verify token slot for password reset
        user.emailVerificationExpires = resetExpires;
        await user.save();
        await (0, mailer_1.sendPasswordResetEmail)(user.email, resetToken);
        await logUserActivity(user._id.toString(), 'PASSWORD_RESET_REQUESTED', req);
        res.status(200).json({ message: 'If that email exists, we have sent a reset password link.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to request password reset.' });
    }
};
exports.forgotPassword = forgotPassword;
// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        const user = await User_1.User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() },
        });
        if (!user) {
            res.status(400).json({ error: 'Invalid or expired password reset token.' });
            return;
        }
        user.password = password; // pre-save hook will hash it
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        // Revoke current active refresh token to log out other devices
        user.refreshToken = undefined;
        await user.save();
        await logUserActivity(user._id.toString(), 'PASSWORD_RESET_SUCCESS', req);
        res.status(200).json({ message: 'Password reset successful. You can now log in.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to reset password.' });
    }
};
exports.resetPassword = resetPassword;
// Token Refresh
const refreshToken = async (req, res) => {
    try {
        // Accept refresh token from cookie (preferred) or request body (dev fallback)
        const token = req.cookies.refreshToken || req.body?.refreshToken;
        // Debug logging to help trace refresh failures in dev
        const mask = (t) => {
            if (!t)
                return 'none';
            try {
                return `${t.slice(0, 8)}...${t.slice(-6)}`;
            }
            catch {
                return 'masked';
            }
        };
        console.log('[auth:refresh] tokenFromCookie=', !!req.cookies.refreshToken, ' tokenFromBody=', !!req.body?.refreshToken);
        console.log('[auth:refresh] token=', mask(token));
        if (!token) {
            res.status(401).json({ error: 'Refresh token not found' });
            return;
        }
        const decoded = (0, jwt_1.verifyRefreshToken)(token);
        const admin = await Admin_1.Admin.findById(decoded.userId);
        if (admin && admin.refreshToken === token) {
            if (admin.status === 'suspended') {
                res.status(403).json({ error: 'Account suspended' });
                return;
            }
            const newAccessToken = (0, jwt_1.generateAccessToken)({
                userId: admin._id.toString(),
                role: admin.role,
                is2faVerified: admin.twoFactorEnabled,
            });
            res.status(200).json({ accessToken: newAccessToken });
            return;
        }
        const user = await User_1.User.findById(decoded.userId);
        if (!user || user.refreshToken !== token) {
            res.status(401).json({ error: 'Invalid refresh token' });
            return;
        }
        if (user.status === 'suspended') {
            res.status(403).json({ error: 'Account suspended' });
            return;
        }
        const newAccessToken = (0, jwt_1.generateAccessToken)({
            userId: user._id.toString(),
            role: user.role,
            is2faVerified: user.twoFactorEnabled,
        });
        res.status(200).json({ accessToken: newAccessToken });
    }
    catch (error) {
        res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
};
exports.refreshToken = refreshToken;
// Logout
const logout = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (userId) {
            const user = await User_1.User.findById(userId);
            if (user) {
                user.refreshToken = undefined;
                await user.save();
                await logUserActivity(user._id.toString(), 'LOGOUT', req);
            }
            else {
                const admin = await Admin_1.Admin.findById(userId);
                if (admin) {
                    admin.refreshToken = undefined;
                    await admin.save();
                    await logUserActivity(admin._id.toString(), 'LOGOUT', req);
                }
            }
        }
        res.clearCookie('refreshToken');
        res.status(200).json({ message: 'Logged out successfully.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to log out.' });
    }
};
exports.logout = logout;
// Get current user metadata & settings status
const getMe = async (req, res) => {
    try {
        if (req.user?.role === 'admin' || req.user?.role === 'superadmin') {
            const admin = await Admin_1.Admin.findById(req.user.id).select('-password -refreshToken');
            if (!admin) {
                res.status(404).json({ error: 'Admin not found' });
                return;
            }
            res.status(200).json({
                user: {
                    id: admin._id,
                    email: admin.email,
                    firstName: admin.firstName,
                    lastName: admin.lastName,
                    role: admin.role,
                    isMobileVerified: false,
                    twoFactorEnabled: admin.twoFactorEnabled,
                },
            });
            return;
        }
        const user = await User_1.User.findById(req.user?.id).select('-password -refreshToken');
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.status(200).json({ user });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve user details.' });
    }
};
exports.getMe = getMe;
