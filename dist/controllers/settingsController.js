"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserStatus = exports.getAllUsers = exports.updateSetting = exports.getSettings = void 0;
const Settings_1 = require("../models/Settings");
const User_1 = require("../models/User");
const AdminLog_1 = require("../models/AdminLog");
const getSettings = async (req, res) => {
    try {
        const list = await Settings_1.Settings.find({});
        res.status(200).json({ settings: list });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve platform settings.' });
    }
};
exports.getSettings = getSettings;
const updateSetting = async (req, res) => {
    try {
        const adminId = req.user?.id;
        const { key, value } = req.body;
        const setting = await Settings_1.Settings.findOne({ key });
        if (!setting) {
            res.status(404).json({ error: `Setting key '${key}' not found` });
            return;
        }
        const oldValue = setting.value;
        setting.value = value;
        setting.updatedBy = adminId;
        await setting.save();
        // Audit logs for admin activity
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        await AdminLog_1.AdminLog.create({
            adminId,
            action: `UPDATE_SETTING_${key}`,
            ipAddress,
            details: `Changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(value)}`,
        });
        res.status(200).json({ message: `Setting '${key}' updated successfully.`, setting });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update setting.' });
    }
};
exports.updateSetting = updateSetting;
// Admin User Management routes
const getAllUsers = async (req, res) => {
    try {
        const users = await User_1.User.find({}).select('-password -refreshToken').sort({ createdAt: -1 });
        res.status(200).json({ users });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve user directory.' });
    }
};
exports.getAllUsers = getAllUsers;
const updateUserStatus = async (req, res) => {
    try {
        const adminId = req.user?.id;
        const { userId } = req.params;
        const { status } = req.body; // 'active', 'suspended', 'pending'
        if (!['active', 'suspended', 'pending'].includes(status)) {
            res.status(400).json({ error: 'Invalid user status' });
            return;
        }
        const user = await User_1.User.findById(userId);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const oldStatus = user.status;
        user.status = status;
        await user.save();
        const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
        await AdminLog_1.AdminLog.create({
            adminId,
            action: `UPDATE_USER_STATUS_${status.toUpperCase()}`,
            targetUserId: user._id,
            ipAddress,
            details: `Status updated from ${oldStatus} to ${status}`,
        });
        res.status(200).json({ message: `User status updated to ${status} successfully.`, user });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user status.' });
    }
};
exports.updateUserStatus = updateUserStatus;
