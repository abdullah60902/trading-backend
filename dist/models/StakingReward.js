"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StakingReward = void 0;
const mongoose_1 = require("mongoose");
const StakingRewardSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    planId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'StakingPlan',
        required: true,
        index: true,
    },
    currency: {
        type: String,
        required: true,
    },
    amount: {
        type: mongoose_1.Schema.Types.Decimal128,
        required: true,
    },
    rewardDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
}, {
    timestamps: true,
});
exports.StakingReward = (0, mongoose_1.model)('StakingReward', StakingRewardSchema);
