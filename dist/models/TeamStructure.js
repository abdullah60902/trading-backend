"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamStructure = void 0;
const mongoose_1 = require("mongoose");
const TeamStructureSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    uplineId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    level: {
        type: Number,
        required: true,
    },
}, {
    timestamps: true,
});
// A user shouldn't be under the same upline twice
TeamStructureSchema.index({ userId: 1, uplineId: 1 }, { unique: true });
exports.TeamStructure = (0, mongoose_1.model)('TeamStructure', TeamStructureSchema);
