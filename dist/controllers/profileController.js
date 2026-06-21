"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.updateNotificationPreferences = exports.getNotificationPreferences = exports.submitKycDocument = exports.updateProfilePicture = exports.changePassword = exports.uploadKycDoc = exports.uploadAvatar = void 0;
const multer_1 = __importDefault(require("multer"));
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const User_1 = require("../models/User");
const UserLog_1 = require("../models/UserLog");
// Helper to log user activity
const logUserActivity = async (userId, action, req) => {
    try {
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
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
            location: 'Local Network',
        });
    }
    catch (error) {
        console.error('Failed to write user log:', error);
    }
};
// ------------------------------------------------------------------
// Multer Configuration
// ------------------------------------------------------------------
const avatarStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.default,
    params: {
        folder: 'cryptoplatform/avatars',
        allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
        public_id: (req, file) => `avatar_${req.user?.id}_${Date.now()}`,
    },
});
const kycStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.default,
    params: {
        folder: 'cryptoplatform/kyc',
        allowed_formats: ['jpeg', 'jpg', 'png', 'pdf'],
        public_id: (req, file) => `kyc_${req.user?.id}_${Date.now()}`,
    },
});
exports.uploadAvatar = (0, multer_1.default)({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('avatar');
exports.uploadKycDoc = (0, multer_1.default)({
    storage: kycStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('kyc');
// ------------------------------------------------------------------
// 1. Change Password
// ------------------------------------------------------------------
const changePassword = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            res.status(400).json({ error: 'Old and new passwords are required.' });
            return;
        }
        if (newPassword.length < 8) {
            res.status(400).json({ error: 'New password must be at least 8 characters.' });
            return;
        }
        const user = (await User_1.User.findById(userId));
        if (!user) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }
        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) {
            res.status(400).json({ error: 'Current password is incorrect.' });
            return;
        }
        user.password = newPassword; // pre-save hook will hash it
        // Revoke refresh token so other sessions are logged out
        user.refreshToken = undefined;
        await user.save();
        await logUserActivity(userId, 'PASSWORD_CHANGED', req);
        res.status(200).json({ message: 'Password changed successfully. Please log in again on other devices.' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to change password.' });
    }
};
exports.changePassword = changePassword;
// ------------------------------------------------------------------
// 2. Upload Profile Picture
// ------------------------------------------------------------------
const updateProfilePicture = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!req.file) {
            res.status(400).json({ error: 'No image file uploaded.' });
            return;
        }
        const user = (await User_1.User.findById(userId));
        if (!user) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }
        // Delete old avatar logic removed (could be implemented using cloudinary SDK later)
        const avatarUrl = req.file.path; // Cloudinary automatically returns the URL in file.path
        user.profilePicture = avatarUrl;
        await user.save();
        await logUserActivity(userId, 'PROFILE_PICTURE_UPDATED', req);
        res.status(200).json({ message: 'Profile picture updated successfully.', profilePicture: avatarUrl });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to upload profile picture.' });
    }
};
exports.updateProfilePicture = updateProfilePicture;
// ------------------------------------------------------------------
// 3. Upload KYC Document
// ------------------------------------------------------------------
const submitKycDocument = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!req.file) {
            res.status(400).json({ error: 'No document file uploaded.' });
            return;
        }
        const user = (await User_1.User.findById(userId));
        if (!user) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }
        if (user.kycStatus === 'approved') {
            res.status(400).json({ error: 'KYC already approved. Cannot re-submit.' });
            return;
        }
        if (user.kycStatus === 'pending') {
            res.status(400).json({ error: 'KYC document already submitted and is pending review.' });
            return;
        }
        const docUrl = req.file.path;
        user.kycDocument = docUrl;
        user.kycStatus = 'pending';
        await user.save();
        await logUserActivity(userId, 'KYC_SUBMITTED', req);
        res.status(200).json({ message: 'KYC document submitted successfully. It is pending admin review.', kycStatus: 'pending' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to submit KYC document.' });
    }
};
exports.submitKycDocument = submitKycDocument;
// ------------------------------------------------------------------
// 4. Get / Update Notification Preferences
// ------------------------------------------------------------------
const getNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = (await User_1.User.findById(userId).select('notificationPreferences'));
        if (!user) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }
        res.status(200).json({ preferences: user.notificationPreferences });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve notification preferences.' });
    }
};
exports.getNotificationPreferences = getNotificationPreferences;
const updateNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { preferences } = req.body;
        if (!preferences || typeof preferences !== 'object') {
            res.status(400).json({ error: 'Invalid preferences object.' });
            return;
        }
        const allowedKeys = ['deposits', 'withdrawals', 'staking', 'referrals', 'salary', 'jackpot', 'announcements', 'security'];
        const update = {};
        for (const key of allowedKeys) {
            if (typeof preferences[key] === 'boolean') {
                update[`notificationPreferences.${key}`] = preferences[key];
            }
        }
        const user = (await User_1.User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select('notificationPreferences'));
        if (!user) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }
        await logUserActivity(userId, 'NOTIFICATION_PREFS_UPDATED', req);
        res.status(200).json({ message: 'Notification preferences updated.', preferences: user.notificationPreferences });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update notification preferences.' });
    }
};
exports.updateNotificationPreferences = updateNotificationPreferences;
// ------------------------------------------------------------------
// 5. Get Profile (aggregated for settings page)
// ------------------------------------------------------------------
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await User_1.User.findById(userId).select('-password -refreshToken -twoFactorSecret -emailVerificationToken');
        if (!user) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }
        res.status(200).json({ user });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve profile.' });
    }
};
exports.getProfile = getProfile;
