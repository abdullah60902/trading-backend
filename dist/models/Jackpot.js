"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Jackpot = void 0;
const mongoose_1 = require("mongoose");
const JackpotSchema = new mongoose_1.Schema({
    round: {
        type: Number,
        required: true,
        unique: true,
    },
    poolAmount: {
        type: mongoose_1.Schema.Types.Decimal128,
        default: 0,
    },
    status: {
        type: String,
        enum: ['open', 'drawn'],
        default: 'open',
        index: true,
    },
    participants: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    winnerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    drawnAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
exports.Jackpot = (0, mongoose_1.model)('Jackpot', JackpotSchema);
