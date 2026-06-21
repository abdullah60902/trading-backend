"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markRead = exports.getNotifications = void 0;
const Notification_1 = require("../models/Notification");
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        const notifications = await Notification_1.Notification.find({ userId }).sort({ createdAt: -1 }).limit(100);
        res.status(200).json({ notifications });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve notifications.' });
    }
};
exports.getNotifications = getNotifications;
const markRead = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (id === 'all') {
            await Notification_1.Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
            res.status(200).json({ message: 'All notifications marked as read' });
            return;
        }
        const notification = await Notification_1.Notification.findOneAndUpdate({ _id: id, userId }, { $set: { isRead: true } }, { new: true });
        if (!notification) {
            res.status(404).json({ error: 'Notification not found' });
            return;
        }
        res.status(200).json({ message: 'Notification marked as read', notification });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to mark notification as read.' });
    }
};
exports.markRead = markRead;
