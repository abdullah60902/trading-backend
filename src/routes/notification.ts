import { Router } from 'express';
import { getNotifications, markRead } from '../controllers/notificationController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.put('/:id/read', markRead);

export default router;
