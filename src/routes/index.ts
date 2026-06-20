import { Router } from 'express';
import authRoutes from './auth';
import walletRoutes from './wallet';
import logRoutes from './log';
import settingsRoutes from './settings';
import notificationRoutes from './notification';
import stakingRoutes from './staking';
import referralRoutes from './referral';
import adminRoutes from './admin';
import featureRoutes from './features';
import profileRoutes from './profile';
import coinRoutes from './coin';

const router = Router();

router.use('/auth', authRoutes);
router.use('/wallets', walletRoutes);
router.use('/logs', logRoutes);
router.use('/settings', settingsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/staking', stakingRoutes);
router.use('/referral', referralRoutes);
router.use('/admin', adminRoutes);
router.use('/features', featureRoutes);
router.use('/profile', profileRoutes);
router.use('/coins', coinRoutes);

export default router;

