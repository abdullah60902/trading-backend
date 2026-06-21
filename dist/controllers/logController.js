"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUserLogs = exports.getAdminLogs = exports.getUserLogs = void 0;
const UserLog_1 = require("../models/UserLog");
const AdminLog_1 = require("../models/AdminLog");
const getUserLogs = async (req, res) => {
    try {
        const userId = req.user?.id;
        const logs = await UserLog_1.UserLog.find({ userId }).sort({ createdAt: -1 }).limit(100);
        res.status(200).json({ logs });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve activity history.' });
    }
};
exports.getUserLogs = getUserLogs;
const getAdminLogs = async (req, res) => {
    try {
        const logs = await AdminLog_1.AdminLog.find({})
            .populate('adminId', 'email firstName lastName')
            .populate('targetUserId', 'email')
            .sort({ createdAt: -1 })
            .limit(100);
        res.status(200).json({ logs });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve administrative logs.' });
    }
};
exports.getAdminLogs = getAdminLogs;
const getAllUserLogs = async (req, res) => {
    try {
        const logs = await UserLog_1.UserLog.find({})
            .populate('userId', 'email firstName lastName')
            .sort({ createdAt: -1 })
            .limit(200);
        res.status(200).json({ logs });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve user logs.' });
    }
};
exports.getAllUserLogs = getAllUserLogs;
