import { Router } from 'express';
import {
  getSettings,
  updateSetting,
  getAllUsers,
  updateUserStatus,
} from '../controllers/settingsController';
import { requireAuth, requireAdminAuth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateSettingsSchema } from '../utils/validators';

const router = Router();

router.get('/', requireAuth, getSettings);
router.put('/', requireAdminAuth, validate(updateSettingsSchema), updateSetting);

// User Directory Administration
router.get('/users', requireAdminAuth, getAllUsers);
router.put('/users/:userId/status', requireAdminAuth, updateUserStatus);

export default router;
