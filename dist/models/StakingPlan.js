"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StakingPlan = void 0;
const mongoose_1 = require("mongoose");
const StakingPlanSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    walletId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Wallet',
        required: true,
    },
    currency: {
        type: String,
        enum: ['USD', 'BTC', 'ETH', 'USDT'],
        required: true,
    },
    lockedCapital: {
        type: mongoose_1.Schema.Types.Decimal128,
        required: true,
    },
    monthlyRatePct: {
        type: Number,
        default: 10,
    },
    totalRewardLimit: {
        type: mongoose_1.Schema.Types.Decimal128,
        required: true,
    },
    totalRewardEarned: {
        type: mongoose_1.Schema.Types.Decimal128,
        default: 0,
    },
    lastPayoutAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['active', 'completed'],
        default: 'active',
        index: true,
    },
    startedAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: {
        type: Date,
    },
}, { timestamps: true });
// Useful compound index for admin queries
StakingPlanSchema.index({ userId: 1, status: 1 });
exports.StakingPlan = (0, mongoose_1.model)('StakingPlan', StakingPlanSchema);
