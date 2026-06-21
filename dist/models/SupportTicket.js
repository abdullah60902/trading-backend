"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportTicket = void 0;
const mongoose_1 = require("mongoose");
const SupportTicketSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    subject: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: false,
        default: '',
    },
    status: {
        type: String,
        enum: ['open', 'replied', 'closed'],
        default: 'open',
        index: true,
    },
    replies: [
        {
            sender: {
                type: String,
                enum: ['user', 'admin'],
                required: true,
            },
            message: {
                type: String,
                required: true,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
}, {
    timestamps: true,
});
exports.SupportTicket = (0, mongoose_1.model)('SupportTicket', SupportTicketSchema);
