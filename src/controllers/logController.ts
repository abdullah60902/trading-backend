import { Response } from 'express';
import { UserLog } from '../models/UserLog';
import { AdminLog } from '../models/AdminLog';
import { AuthenticatedRequest } from '../middleware/auth';

export const getUserLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const logs = await UserLog.find({ userId }).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve activity history.' });
  }
};

export const getAdminLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await AdminLog.find({})
      .populate('adminId', 'email firstName lastName')
      .populate('targetUserId', 'email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve administrative logs.' });
  }
};

export const getAllUserLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await UserLog.find({})
      .populate('userId', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .limit(200);
    res.status(200).json({ logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user logs.' });
  }
};
