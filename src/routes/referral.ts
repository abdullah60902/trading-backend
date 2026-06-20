import { Router } from 'express';
import { getReferralStats, getTeamMembers } from '../controllers/referralController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/stats', getReferralStats);
router.get('/team', getTeamMembers);

export default router;
