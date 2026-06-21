"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserLog = void 0;
const mongoose_1 = require("mongoose");
const UserLogSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    action: {
        type: String,
        required: true,
    },
    ipAddress: {
        type: String,
        required: true,
    },
    userAgent: {
        type: String,
        required: true,
    },
    deviceInfo: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        default: 'Unknown',
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
});
exports.UserLog = (0, mongoose_1.model)('UserLog', UserLogSchema);
