"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Salary = void 0;
const mongoose_1 = require("mongoose");
const SalarySchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    monthlyAmount: {
        type: mongoose_1.Schema.Types.Decimal128,
        required: true,
    },
    currency: {
        type: String,
        required: true,
        default: 'USDT',
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
        index: true,
    },
    lastPaidAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
exports.Salary = (0, mongoose_1.model)('Salary', SalarySchema);
