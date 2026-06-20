import { Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { StakingPlan } from '../models/StakingPlan';
import { Earning } from '../models/Earning';
import { Notification } from '../models/Notification';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Distributes multi-level referral commissions when a user stakes capital.
 * Triggered inside the staking transaction session.
 */
export const distributeCommissions = async (
  userId: string,
  amount: number,
  currency: string,
  session: mongoose.ClientSession
): Promise<void> => {
  try {
    const user = await User.findById(userId).session(session);
    if (!user || !user.referredBy) {
      return; // No sponsor, no commissions to distribute
    }

    // Split referralPath to find the hierarchy uplines
    const pathIds = user.referralPath.split(',').filter((id) => id.trim() !== '');
    const userIndex = pathIds.indexOf(userId.toString());
    if (userIndex === -1) return;

    // Uplines in order: [Level 1 (Direct), Level 2 (Grandparent), Level 3 (Great-grandparent), ...]
    const uplines = pathIds.slice(0, userIndex).reverse();

    // Standard 3-level commission structure: L1: 5%, L2: 3%, L3: 1%
    const commissionRates = [0.05, 0.03, 0.01];

    for (let i = 0; i < commissionRates.length; i++) {
      if (i >= uplines.length) break; // Reached the root of the tree

      const uplineId = uplines[i];
      const rate = commissionRates[i];
      const commissionAmount = amount * rate;

      if (commissionAmount <= 0) continue;

      // Fetch or verify upline wallet
      const uplineWallet = await Wallet.findOne({ userId: uplineId, currency }).session(session);
      if (!uplineWallet) continue;

      // Credit the commission to the Earnings Wallet
      const currentEarnBal = Number(uplineWallet.earningsBalance.toString());
      uplineWallet.earningsBalance = mongoose.Types.Decimal128.fromString(
        (currentEarnBal + commissionAmount).toFixed(8)
      );
      await uplineWallet.save({ session });

      const earningType = i === 0 ? 'referral' : 'team';
      const levelNum = i + 1;

      // Write to Earning explicit collection
      const earningRecord = new Earning({
        userId: uplineId,
        type: earningType,
        currency,
        amount: mongoose.Types.Decimal128.fromString(commissionAmount.toFixed(8)),
        sourceId: user._id
      });
      await earningRecord.save({ session });

      // Write earnings transaction
      const txn = new Transaction({
        userId: uplineId,
        walletId: uplineWallet._id,
        type: 'earnings',
        currency,
        amount: mongoose.Types.Decimal128.fromString(commissionAmount.toFixed(8)),
        fee: mongoose.Types.Decimal128.fromString('0.00'),
        status: 'completed',
        metadata: {
          earningType,
          description: `Level ${levelNum} MLM Commission from User ${user.firstName} ${user.lastName} (Staked ${amount} ${currency})`,
          sourceUserId: user._id,
          level: levelNum,
          earningRecordId: earningRecord._id
        },
      });
      await txn.save({ session });

      // Create Notification for the upline
      await Notification.create([{
        userId: uplineId,
        title: `MLM Level ${levelNum} Commission Received`,
        message: `You earned ${commissionAmount.toFixed(4)} ${currency} as Level ${levelNum} commission from ${user.firstName} ${user.lastName}.`,
        type: 'success',
      }], { session });

      // Emit real-time notification
      const { emitToUser } = require('../utils/socket');
      emitToUser(uplineId.toString(), 'notification', {
        type: 'earnings_received',
        title: `MLM Level ${levelNum} Commission Received`,
        message: `You earned ${commissionAmount.toFixed(4)} ${currency} as Level ${levelNum} commission from ${user.firstName} ${user.lastName}.`,
        date: new Date()
      });
    }
  } catch (error) {
    console.error('Failed to distribute MLM commissions:', error);
    throw error; // Propagate error to roll back staking transaction
  }
};

/**
 * Get Referral Analytics and Dashboard Stats
 */
export const getReferralStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(400).json({ error: 'User ID not found in request' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Direct referrals (Level 1 count)
    const directReferralsCount = await User.countDocuments({ referredBy: userId });

    // Total team size (all descendants in the path)
    const downlineUsers = await User.find(
      { referralPath: { $regex: `,${userId},` }, _id: { $ne: userId } },
      { _id: 1 }
    );
    const downlineIds = downlineUsers.map((u) => u._id);
    const totalTeamCount = downlineIds.length;

    const earningsRecords = await Earning.find({
      userId,
      type: { $in: ['referral', 'team'] },
    });

    let totalReferralEarnings = 0;
    let totalTeamEarnings = 0;

    earningsRecords.forEach((earning) => {
      const amt = Number(earning.amount.toString());
      if (earning.type === 'referral') {
        totalReferralEarnings += amt;
      } else {
        totalTeamEarnings += amt;
      }
    });

    // Active staking team count (descendants with active staking plans)
    const activeStakingCount = await StakingPlan.distinct('userId', {
      userId: { $in: downlineIds },
      status: 'active',
    });

    // Total sales / locked capital by team members (all levels)
    const activePlans = await StakingPlan.find({
      userId: { $in: downlineIds },
      status: 'active',
    });
    const totalTeamSales = activePlans.reduce(
      (sum, plan) => sum + Number(plan.lockedCapital.toString()),
      0
    );

    res.status(200).json({
      referralCode: user.referralCode,
      referralLink: `${req.protocol}://${req.get('host')}/register?ref=${user.referralCode}`,
      stats: {
        directReferralsCount,
        totalTeamCount,
        totalReferralEarnings,
        totalTeamEarnings,
        totalCombinedEarnings: totalReferralEarnings + totalTeamEarnings,
        activeStakingTeamCount: activeStakingCount.length,
        totalTeamSales,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve referral statistics.' });
  }
};

/**
 * Get downline team list up to Level 3, with individual earnings contributions
 */
export const getTeamMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(400).json({ error: 'User ID not found in request' });
      return;
    }

    // Find all downline users
    const downline = await User.find(
      { referralPath: { $regex: `,${userId},` }, _id: { $ne: userId } },
      { firstName: true, lastName: true, email: true, createdAt: true, referralPath: true, referredBy: true, status: true }
    ).lean();

    // Fetch all earnings received by this user from MLM commissions
    const earningsRecords = await Earning.find({
      userId,
      type: { $in: ['referral', 'team'] },
    });

    // Map sourceUserId to commission generated
    const earningsBySource = new Map<string, number>();
    earningsRecords.forEach((earning) => {
      const srcId = earning.sourceId?.toString();
      if (srcId) {
        const amt = Number(earning.amount.toString());
        earningsBySource.set(srcId, (earningsBySource.get(srcId) || 0) + amt);
      }
    });

    // Enrich the downline list with levels relative to current user and individual sales
    const enrichedDownline = await Promise.all(
      downline.map(async (member) => {
        const pathIds = member.referralPath.split(',').filter((id) => id.trim() !== '');
        const currentUserIndex = pathIds.indexOf(userId.toString());
        const memberIndex = pathIds.indexOf(member._id.toString());
        const level = memberIndex - currentUserIndex;

        // Fetch user's active staking plans to get their individual sales contribution
        const userStaking = await StakingPlan.find({ userId: member._id, status: 'active' });
        const individualSales = userStaking.reduce(
          (sum, plan) => sum + Number(plan.lockedCapital.toString()),
          0
        );

        return {
          id: member._id,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          status: member.status,
          createdAt: member.createdAt,
          referredBy: member.referredBy,
          level,
          commissionsEarned: earningsBySource.get(member._id.toString()) || 0,
          individualSales,
        };
      })
    );

    // Limit downline list to Level 1, 2, and 3
    const filteredDownline = enrichedDownline.filter((member) => member.level >= 1 && member.level <= 3);

    res.status(200).json({
      team: filteredDownline,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve team downline details.' });
  }
};
