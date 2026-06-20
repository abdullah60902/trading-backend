import { Response } from 'express';
import { Notification } from '../models/Notification';
import { AuthenticatedRequest } from '../middleware/auth';

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ notifications });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
};

export const markRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (id === 'all') {
      await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
      res.status(200).json({ message: 'All notifications marked as read' });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
};
