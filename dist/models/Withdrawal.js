"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Withdrawal = void 0;
const mongoose_1 = require("mongoose");
const WithdrawalSchema = new mongoose_1.Schema({
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
    fee: {
        type: mongoose_1.Schema.Types.Decimal128,
        required: true,
        default: 0.00,
    },
    recipientAddress: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'processing'],
        default: 'pending',
        index: true,
    },
    txHash: {
        type: String,
        sparse: true,
    },
}, {
    timestamps: true,
});
exports.Withdrawal = (0, mongoose_1.model)('Withdrawal', WithdrawalSchema);
