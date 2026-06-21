"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerStakingPayout = exports.creditMockEarning = exports.getEarnings = exports.getStakingStats = exports.createStaking = void 0;
const Wallet_1 = require("../models/Wallet");
const Transaction_1 = require("../models/Transaction");
const StakingPlan_1 = require("../models/StakingPlan");
const Earning_1 = require("../models/Earning");
const Notification_1 = require("../models/Notification");
const UserLog_1 = require("../models/UserLog");
const mongoose_1 = __importDefault(require("mongoose"));
const cron_1 = require("../utils/cron");
const referralController_1 = require("./referralController");
// Create a Staking Plan (Locks coins permanently from mainBalance)
const createStaking = async (req, res) => {
    const session = await mongoose_1.default.startSession();
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
        const wallet = await Wallet_1.Wallet.findOne({ userId, currency }).session(session);
        if (!wallet || Number(wallet.mainBalance.toString()) < amount) {
            res.status(400).json({ error: 'Insufficient main wallet balance to stake' });
            await session.abortTransaction();
            session.endSession();
            return;
        }
        // Deduct permanently from Main Wallet
        const currentMainBal = Number(wallet.mainBalance.toString());
        wallet.mainBalance = mongoose_1.default.Types.Decimal128.fromString((currentMainBal - amount).toString());
        await wallet.save({ session });
        const limitMax = amount * 3.0;
        // Create the StakingPlan record
        const plan = new StakingPlan_1.StakingPlan({
            userId,
            walletId: wallet._id,
            currency,
            lockedCapital: mongoose_1.default.Types.Decimal128.fromString(amount.toString()),
            totalRewardLimit: mongoose_1.default.Types.Decimal128.fromString(limitMax.toString()),
            monthlyRatePct: 10,
            totalRewardEarned: mongoose_1.default.Types.Decimal128.fromString('0.00'),
            status: 'active',
            startedAt: new Date(),
            lastPayoutAt: new Date()
        });
        await plan.save({ session });
        // Distribute MLM commissions up to 3 levels
        await (0, referralController_1.distributeCommissions)(userId.toString(), amount, currency, session);
        await Notification_1.Notification.create([{
                userId,
                title: 'Staking Plan Activated',
                message: `Successfully locked ${amount} ${currency} into 10% monthly staking. Total reward limit is ${limitMax} ${currency} (3x).`,
                type: 'success',
            }], { session });
        // Activity logging
        const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
        await UserLog_1.UserLog.create([{
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
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: 'Failed to initialize staking plan.' });
    }
};
exports.createStaking = createStaking;
// Retrieve Staking Stats & Active/Completed Plans
const getStakingStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        // Find all staking plans
        const plans = await StakingPlan_1.StakingPlan.find({ userId }).sort({ createdAt: -1 });
        let activeCapital = 0;
        let totalLockedCapital = 0;
        let totalRewardsClaimed = 0;
        let remainingRewards = 0;
        const activePlansList = [];
        const completedPlansList = [];
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
            }
            else {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve staking analytics.' });
    }
};
exports.getStakingStats = getStakingStats;
// Fetch sub-earnings (staking, referral, daily, team, rank, salary, jackpot)
const getEarnings = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { earningType } = req.query;
        const filter = { userId };
        if (earningType) {
            filter['type'] = earningType;
        }
        const earnings = await Earning_1.Earning.find(filter).sort({ createdAt: -1 }).limit(100);
        res.status(200).json({ earnings });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve earnings logs.' });
    }
};
exports.getEarnings = getEarnings;
// Create a mock helper to credit other earnings types (Referral, Team, Jackpot etc. for demo purposes)
const creditMockEarning = async (req, res) => {
    const session = await mongoose_1.default.startSession();
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
        const wallet = await Wallet_1.Wallet.findOne({ userId, currency }).session(session);
        if (!wallet) {
            res.status(404).json({ error: 'Wallet not found' });
            await session.abortTransaction();
            session.endSession();
            return;
        }
        // Add to earningsBalance (Earnings Wallet)
        const currentEarnBal = Number(wallet.earningsBalance.toString());
        wallet.earningsBalance = mongoose_1.default.Types.Decimal128.fromString((currentEarnBal + amount).toString());
        await wallet.save({ session });
        // Write to explicit Earning collection
        const earningRecord = new Earning_1.Earning({
            userId,
            type: earningType,
            currency,
            amount: mongoose_1.default.Types.Decimal128.fromString(amount.toString()),
        });
        await earningRecord.save({ session });
        // Write earnings transaction
        const txn = new Transaction_1.Transaction({
            userId,
            walletId: wallet._id,
            type: 'earnings',
            currency,
            amount: mongoose_1.default.Types.Decimal128.fromString(amount.toString()),
            fee: mongoose_1.default.Types.Decimal128.fromString('0.00'),
            status: 'completed',
            metadata: {
                earningType,
                description: description || `Mock ${earningType} earnings credit`,
                earningRecordId: earningRecord._id
            },
        });
        await txn.save({ session });
        await Notification_1.Notification.create([{
                userId,
                title: `${earningType.toUpperCase()} Earnings Received`,
                message: `Credited ${amount} ${currency} into your Earnings Wallet.`,
                type: 'success',
            }], { session });
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ message: 'Earning credited successfully', transaction: txn });
    }
    catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: 'Failed to credit mock earning.' });
    }
};
exports.creditMockEarning = creditMockEarning;
const triggerStakingPayout = async (req, res) => {
    try {
        const result = await (0, cron_1.processStakingRewards)();
        res.status(200).json({
            message: 'Staking payout distribution run completed successfully',
            result,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Manual payout trigger failed' });
    }
};
exports.triggerStakingPayout = triggerStakingPayout;
