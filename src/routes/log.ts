import { Router } from 'express';
import { getUserLogs, getAdminLogs, getAllUserLogs } from '../controllers/logController';
import { requireAuth, requireAdminAuth } from '../middleware/auth';

const router = Router();

router.get('/user', requireAuth, getUserLogs);
router.get('/admin', requireAdminAuth, getAdminLogs);
router.get('/all-users', requireAdminAuth, getAllUserLogs);

export default router;
