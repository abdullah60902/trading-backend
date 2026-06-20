import { Response } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';
import { User } from '../models/User';
import { UserLog } from '../models/UserLog';
import { AuthenticatedRequest } from '../middleware/auth';

// Helper to log user activity
const logUserActivity = async (userId: string, action: string, req: any) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    let deviceInfo = 'Desktop';
    if (/mobile/i.test(userAgent)) deviceInfo = 'Mobile';
    else if (/tablet/i.test(userAgent)) deviceInfo = 'Tablet';

    await UserLog.create({
      userId,
      action,
      ipAddress,
      userAgent,
      deviceInfo,
      location: 'Local Network',
    });
  } catch (error) {
    console.error('Failed to write user log:', error);
  }
};

// ------------------------------------------------------------------
// Multer Configuration
// ------------------------------------------------------------------
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cryptoplatform/avatars',
    allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
    public_id: (req: any, file: any) => `avatar_${req.user?.id}_${Date.now()}`,
  } as any,
});

const kycStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cryptoplatform/kyc',
    allowed_formats: ['jpeg', 'jpg', 'png', 'pdf'],
    public_id: (req: any, file: any) => `kyc_${req.user?.id}_${Date.now()}`,
  } as any,
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).single('avatar');

export const uploadKycDoc = multer({
  storage: kycStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('kyc');

// ------------------------------------------------------------------
// 1. Change Password
// ------------------------------------------------------------------
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const user = (await User.findById(userId)) as any;
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

    await logUserActivity(userId!, 'PASSWORD_CHANGED', req);

    res.status(200).json({ message: 'Password changed successfully. Please log in again on other devices.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
};

// ------------------------------------------------------------------
// 2. Upload Profile Picture
// ------------------------------------------------------------------
export const updateProfilePicture = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!req.file) {
      res.status(400).json({ error: 'No image file uploaded.' });
      return;
    }

    const user = (await User.findById(userId)) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    // Delete old avatar logic removed (could be implemented using cloudinary SDK later)

    const avatarUrl = req.file.path; // Cloudinary automatically returns the URL in file.path
    user.profilePicture = avatarUrl;
    await user.save();

    await logUserActivity(userId!, 'PROFILE_PICTURE_UPDATED', req);

    res.status(200).json({ message: 'Profile picture updated successfully.', profilePicture: avatarUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload profile picture.' });
  }
};

// ------------------------------------------------------------------
// 3. Upload KYC Document
// ------------------------------------------------------------------
export const submitKycDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!req.file) {
      res.status(400).json({ error: 'No document file uploaded.' });
      return;
    }

    const user = (await User.findById(userId)) as any;
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

    await logUserActivity(userId!, 'KYC_SUBMITTED', req);

    res.status(200).json({ message: 'KYC document submitted successfully. It is pending admin review.', kycStatus: 'pending' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit KYC document.' });
  }
};

// ------------------------------------------------------------------
// 4. Get / Update Notification Preferences
// ------------------------------------------------------------------
export const getNotificationPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = (await User.findById(userId).select('notificationPreferences')) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.status(200).json({ preferences: user.notificationPreferences });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve notification preferences.' });
  }
};

export const updateNotificationPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      res.status(400).json({ error: 'Invalid preferences object.' });
      return;
    }

    const allowedKeys = ['deposits', 'withdrawals', 'staking', 'referrals', 'salary', 'jackpot', 'announcements', 'security'];
    const update: Record<string, boolean> = {};

    for (const key of allowedKeys) {
      if (typeof preferences[key] === 'boolean') {
        update[`notificationPreferences.${key}`] = preferences[key];
      }
    }

    const user = (await User.findByIdAndUpdate(userId, { $set: update }, { new: true }).select('notificationPreferences')) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    await logUserActivity(userId!, 'NOTIFICATION_PREFS_UPDATED', req);

    res.status(200).json({ message: 'Notification preferences updated.', preferences: user.notificationPreferences });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification preferences.' });
  }
};

// ------------------------------------------------------------------
// 5. Get Profile (aggregated for settings page)
// ------------------------------------------------------------------
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId).select('-password -refreshToken -twoFactorSecret -emailVerificationToken');
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
};
