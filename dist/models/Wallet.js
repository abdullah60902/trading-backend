"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = void 0;
const mongoose_1 = require("mongoose");
const WalletSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    currency: {
        type: String,
        enum: ['USD', 'BTC', 'ETH', 'USDT'],
        required: true,
    },
    mainBalance: {
        type: mongoose_1.Schema.Types.Decimal128,
        required: true,
        default: 0.00,
    },
    depositBalance: {
        type: mongoose_1.Schema.Types.Decimal128,
        required: true,
        default: 0.00,
    },
    earningsBalance: {
        type: mongoose_1.Schema.Types.Decimal128,
        required: true,
        default: 0.00,
    },
    withdrawalBalance: {
        type: mongoose_1.Schema.Types.Decimal128,
        required: true,
        default: 0.00,
    },
    lockedBalance: {
        type: mongoose_1.Schema.Types.Decimal128,
        required: true,
        default: 0.00,
    },
    depositAddress: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});
// Compound index to ensure a user only has one wallet per currency
WalletSchema.index({ userId: 1, currency: 1 }, { unique: true });
exports.Wallet = (0, mongoose_1.model)('Wallet', WalletSchema);
