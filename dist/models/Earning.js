"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Earning = void 0;
const mongoose_1 = require("mongoose");
const EarningSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['daily', 'referral', 'team', 'rank', 'salary', 'jackpot', 'staking'],
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
    sourceId: {
        type: mongoose_1.Schema.Types.ObjectId,
    },
}, {
    timestamps: true,
});
exports.Earning = (0, mongoose_1.model)('Earning', EarningSchema);
