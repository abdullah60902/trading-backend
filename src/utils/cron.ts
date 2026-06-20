import mongoose from 'mongoose';
import cron from 'node-cron';
import { Transaction } from '../models/Transaction';
import { Wallet } from '../models/Wallet';
import { Notification } from '../models/Notification';
import { StakingPlan } from '../models/StakingPlan';
import { StakingReward } from '../models/StakingReward';
import { Earning } from '../models/Earning';

export const processStakingRewards = async (): Promise<{ processedCount: number; earningsPaid: number }> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1. Fetch active staking plans
    const activePlans = await StakingPlan.find({
      status: 'active',
    }).session(session);

    let processedCount = 0;
    let earningsPaid = 0;

    for (const plan of activePlans) {
      const cap = Number(plan.lockedCapital.toString());
      const earned = Number(plan.totalRewardEarned.toString());
      const limit = Number(plan.totalRewardLimit.toString());

      if (earned >= limit) {
        // Plan already hit 3x, auto-close it
        plan.status = 'completed';
        plan.completedAt = new Date();
        await plan.save({ session });
        continue;
      }

      // Calculate daily reward: 10% monthly divided by 30 days = ~0.333% daily
      const dailyRate = (plan.monthlyRatePct / 100) / 30;
      let payout = cap * dailyRate;

      // Ensure we don't overshoot the 3x cap
      if (earned + payout >= limit) {
        payout = limit - earned;
        plan.status = 'completed';
        plan.totalRewardEarned = mongoose.Types.Decimal128.fromString(limit.toString());
        plan.completedAt = new Date();
      } else {
        plan.totalRewardEarned = mongoose.Types.Decimal128.fromString((earned + payout).toString());
        plan.lastPayoutAt = new Date();
      }

      await plan.save({ session });

      // 2. Find wallet and credit the Earnings balance
      const wallet = await Wallet.findById(plan.walletId).session(session);
      if (wallet) {
        const currentEarnBal = Number(wallet.earningsBalance.toString());
        wallet.earningsBalance = mongoose.Types.Decimal128.fromString((currentEarnBal + payout).toString());
        await wallet.save({ session });

        // 3. Create explicit StakingReward record
        const rewardRecord = new StakingReward({
          userId: plan.userId,
          planId: plan._id,
          currency: plan.currency,
          amount: mongoose.Types.Decimal128.fromString(payout.toString()),
        });
        await rewardRecord.save({ session });

        // 4. Create explicit Earning record
        const earningRecord = new Earning({
          userId: plan.userId,
          type: 'staking',
          currency: plan.currency,
          amount: mongoose.Types.Decimal128.fromString(payout.toString()),
          sourceId: plan._id,
        });
        await earningRecord.save({ session });

        // 5. Create transaction record for the earnings credit
        const earningsTx = new Transaction({
          userId: plan.userId,
          walletId: wallet._id,
          type: 'earnings',
          currency: plan.currency,
          amount: mongoose.Types.Decimal128.fromString(payout.toString()),
          fee: mongoose.Types.Decimal128.fromString('0.00'),
          status: 'completed',
          metadata: {
            earningType: 'staking',
            stakingPlanId: plan._id,
            description: `Daily Staking Payout: ${plan.monthlyRatePct}% monthly rate (${(dailyRate*100).toFixed(3)}% daily)`,
            rewardRecordId: rewardRecord._id
          }
        });
        await earningsTx.save({ session });

        // 4. Send notification alert
        await Notification.create([{
          userId: plan.userId,
          title: 'Staking Reward Credited',
          message: `Your staking plan has paid out ${payout.toFixed(6)} ${plan.currency} earnings.`,
          type: 'success',
        }], { session });

        processedCount++;
        earningsPaid += payout;
      }
    }

    await session.commitTransaction();
    session.endSession();
    return { processedCount, earningsPaid };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error in staking reward processing:', error);
    throw error;
  }
};

// Start a background recurring timer using node-cron
export const startStakingCron = () => {
  console.log('⏰ Staking cron yield job scheduler started');
  // Runs yield payouts every day at midnight server time: '0 0 * * *'
  // For demo/dev purposes, let's run it every hour: '0 * * * *'
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('⏰ Running scheduled Staking Yield distribution...');
      const results = await processStakingRewards();
      console.log(`⏰ Distribution complete: Payouts: ${results.processedCount}, Total Yield: ${results.earningsPaid}`);
    } catch (err) {
      console.error('Failed to run scheduled yield distribute:', err);
    }
  });
};
