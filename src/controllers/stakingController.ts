import { Response } from 'express';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { StakingPlan } from '../models/StakingPlan';
import { Earning } from '../models/Earning';
import { Notification } from '../models/Notification';
import { UserLog } from '../models/UserLog';
import { AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { processStakingRewards } from '../utils/cron';
import { distributeCommissions } from './referralController';

// Create a Staking Plan (Locks coins permanently from mainBalance)
export const createStaking = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user?.id;
    const { currency, amount } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    if (amount <= 0) {
      res.status(400).json({ error: 'Staking amount must be positive' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const wallet = await Wallet.findOne({ userId, currency }).session(session);
    if (!wallet || Number(wallet.mainBalance.toString()) < amount) {
      res.status(400).json({ error: 'Insufficient main wallet balance to stake' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Deduct permanently from Main Wallet
    const currentMainBal = Number(wallet.mainBalance.toString());
    wallet.mainBalance = mongoose.Types.Decimal128.fromString((currentMainBal - amount).toString());
    await wallet.save({ session });

    const limitMax = amount * 3.0;
    
    // Create the StakingPlan record
    const plan = new StakingPlan({
      userId,
      walletId: wallet._id,
      currency,
      lockedCapital: mongoose.Types.Decimal128.fromString(amount.toString()),
      totalRewardLimit: mongoose.Types.Decimal128.fromString(limitMax.toString()),
      monthlyRatePct: 10,
      totalRewardEarned: mongoose.Types.Decimal128.fromString('0.00'),
      status: 'active',
      startedAt: new Date(),
      lastPayoutAt: new Date()
    });

    await plan.save({ session });

    // Distribute MLM commissions up to 3 levels
    await distributeCommissions(userId.toString(), amount, currency, session);

    await Notification.create([{
      userId,
      title: 'Staking Plan Activated',
      message: `Successfully locked ${amount} ${currency} into 10% monthly staking. Total reward limit is ${limitMax} ${currency} (3x).`,
      type: 'success',
    }], { session });

    // Activity logging
    const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
    await UserLog.create([{
      userId,
      action: `STAKE_LOCKED_${currency}_${amount}`,
      ipAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      deviceInfo: 'Desktop',
      location: 'Local Network',
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Staking plan started successfully. Coins are locked.',
      plan,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to initialize staking plan.' });
  }
};

// Retrieve Staking Stats & Active/Completed Plans
export const getStakingStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Find all staking plans
    const plans = await StakingPlan.find({ userId }).sort({ createdAt: -1 });

    let activeCapital = 0;
    let totalLockedCapital = 0;
    let totalRewardsClaimed = 0;
    let remainingRewards = 0;

    const activePlansList: any[] = [];
    const completedPlansList: any[] = [];

    plans.forEach((plan) => {
      const cap = Number(plan.lockedCapital.toString());
      const earned = Number(plan.totalRewardEarned.toString());
      const limit = Number(plan.totalRewardLimit.toString());
      
      totalLockedCapital += cap;
      totalRewardsClaimed += earned;

      if (plan.status === 'active') {
        activeCapital += cap;
        remainingRewards += (limit - earned);
        activePlansList.push(plan);
      } else {
        completedPlansList.push(plan);
      }
    });

    // Monthly rewards estimate (10% of active capital)
    const estimatedMonthlyRewards = activeCapital * 0.10;

    res.status(200).json({
      stats: {
        activeCapital,
        totalLockedCapital,
        totalRewardsClaimed,
        remainingRewards,
        estimatedMonthlyRewards,
        activePlansCount: activePlansList.length,
        completedPlansCount: completedPlansList.length,
      },
      activePlans: activePlansList,
      completedPlans: completedPlansList,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve staking analytics.' });
  }
};

// Fetch sub-earnings (staking, referral, daily, team, rank, salary, jackpot)
export const getEarnings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { earningType } = req.query;

    const filter: any = { userId };
    if (earningType) {
      filter['type'] = earningType;
    }

    const earnings = await Earning.find(filter).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ earnings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve earnings logs.' });
  }
};

// Create a mock helper to credit other earnings types (Referral, Team, Jackpot etc. for demo purposes)
export const creditMockEarning = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user?.id;
    const { currency, amount, earningType, description } = req.body;

    const allowedTypes = ['referral', 'team', 'rank', 'salary', 'jackpot', 'daily'];
    if (!allowedTypes.includes(earningType)) {
      res.status(400).json({ error: 'Invalid mock earning type' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    if (amount <= 0) {
      res.status(400).json({ error: 'Amount must be positive' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const wallet = await Wallet.findOne({ userId, currency }).session(session);
    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    // Add to earningsBalance (Earnings Wallet)
    const currentEarnBal = Number(wallet.earningsBalance.toString());
    wallet.earningsBalance = mongoose.Types.Decimal128.fromString((currentEarnBal + amount).toString());
    await wallet.save({ session });

    // Write to explicit Earning collection
    const earningRecord = new Earning({
      userId,
      type: earningType,
      currency,
      amount: mongoose.Types.Decimal128.fromString(amount.toString()),
    });
    await earningRecord.save({ session });

    // Write earnings transaction
    const txn = new Transaction({
      userId,
      walletId: wallet._id,
      type: 'earnings',
      currency,
      amount: mongoose.Types.Decimal128.fromString(amount.toString()),
      fee: mongoose.Types.Decimal128.fromString('0.00'),
      status: 'completed',
      metadata: {
        earningType,
        description: description || `Mock ${earningType} earnings credit`,
        earningRecordId: earningRecord._id
      },
    });
    await txn.save({ session });

    await Notification.create([{
      userId,
      title: `${earningType.toUpperCase()} Earnings Received`,
      message: `Credited ${amount} ${currency} into your Earnings Wallet.`,
      type: 'success',
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Earning credited successfully', transaction: txn });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: 'Failed to credit mock earning.' });
  }
};

export const triggerStakingPayout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await processStakingRewards();
    res.status(200).json({
      message: 'Staking payout distribution run completed successfully',
      result,
    });
  } catch (error) {
    res.status(500).json({ error: 'Manual payout trigger failed' });
  }
};
