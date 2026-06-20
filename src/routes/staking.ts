import { Router } from 'express';
import {
  createStaking,
  getStakingStats,
  getEarnings,
  creditMockEarning,
  triggerStakingPayout,
} from '../controllers/stakingController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/stake', createStaking);
router.get('/stats', getStakingStats);
router.get('/earnings', getEarnings);
router.post('/credit-mock-earning', creditMockEarning);
router.post('/trigger-payout', triggerStakingPayout);

export default router;
