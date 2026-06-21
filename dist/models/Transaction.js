"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
const mongoose_1 = require("mongoose");
const TransactionSchema = new mongoose_1.Schema({
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
    type: {
        type: String,
        enum: ['deposit', 'withdrawal', 'transfer', 'trade', 'staking', 'earnings'],
        required: true,
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
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'rejected', 'closed'],
        default: 'pending',
        index: true,
    },
    txHash: {
        type: String,
        unique: true,
        sparse: true,
    },
    recipientAddress: {
        type: String,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
    },
}, {
    timestamps: true,
});
exports.Transaction = (0, mongoose_1.model)('Transaction', TransactionSchema);
