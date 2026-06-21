"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminLog = void 0;
const mongoose_1 = require("mongoose");
const AdminLogSchema = new mongoose_1.Schema({
    adminId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true,
        index: true,
    },
    action: {
        type: String,
        required: true,
    },
    targetUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
    ipAddress: {
        type: String,
        required: true,
    },
    details: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
});
exports.AdminLog = (0, mongoose_1.model)('AdminLog', AdminLogSchema);
