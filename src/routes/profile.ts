import { Router } from 'express';
import {
  changePassword,
  updateProfilePicture,
  uploadAvatar,
  submitKycDocument,
  uploadKycDoc,
  getNotificationPreferences,
  updateNotificationPreferences,
  getProfile,
} from '../controllers/profileController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// Profile info
router.get('/', getProfile);

// Change password
router.post('/change-password', changePassword);

// Profile picture upload
router.post('/avatar', uploadAvatar, updateProfilePicture);

// KYC document upload
router.post('/kyc', uploadKycDoc, submitKycDocument);

// Notification preferences
router.get('/notifications', getNotificationPreferences);
router.put('/notifications', updateNotificationPreferences);

export default router;
