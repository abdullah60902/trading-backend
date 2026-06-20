import { Response } from 'express';
import { Settings } from '../models/Settings';
import { User } from '../models/User';
import { AdminLog } from '../models/AdminLog';
import { AuthenticatedRequest } from '../middleware/auth';

export const getSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const list = await Settings.find({});
    res.status(200).json({ settings: list });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve platform settings.' });
  }
};

export const updateSetting = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const { key, value } = req.body;

    const setting = await Settings.findOne({ key });
    if (!setting) {
      res.status(404).json({ error: `Setting key '${key}' not found` });
      return;
    }

    const oldValue = setting.value;
    setting.value = value;
    setting.updatedBy = adminId as any;
    await setting.save();

    // Audit logs for admin activity
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    await AdminLog.create({
      adminId,
      action: `UPDATE_SETTING_${key}`,
      ipAddress,
      details: `Changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(value)}`,
    });

    res.status(200).json({ message: `Setting '${key}' updated successfully.`, setting });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update setting.' });
  }
};

// Admin User Management routes
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({}).select('-password -refreshToken').sort({ createdAt: -1 });
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user directory.' });
  }
};

export const updateUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const { userId } = req.params;
    const { status } = req.body; // 'active', 'suspended', 'pending'

    if (!['active', 'suspended', 'pending'].includes(status)) {
      res.status(400).json({ error: 'Invalid user status' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    await AdminLog.create({
      adminId,
      action: `UPDATE_USER_STATUS_${status.toUpperCase()}`,
      targetUserId: user._id,
      ipAddress,
      details: `Status updated from ${oldStatus} to ${status}`,
    });

    res.status(200).json({ message: `User status updated to ${status} successfully.`, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status.' });
  }
};
