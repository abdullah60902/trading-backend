"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDefaultSettings = exports.Settings = void 0;
const mongoose_1 = require("mongoose");
const SettingsSchema = new mongoose_1.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    value: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
    },
    description: {
        type: String,
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: { createdAt: false, updatedAt: true }
});
exports.Settings = (0, mongoose_1.model)('Settings', SettingsSchema);
// Export a function to seed default settings if they don't exist
const seedDefaultSettings = async () => {
    try {
        const defaults = [
            { key: 'MAINTENANCE_MODE', value: false, description: 'Disable all non-admin app access' },
            { key: 'ALLOW_REGISTRATION', value: true, description: 'Allow new user registration' },
            { key: 'WITHDRAWAL_LIMIT_USD', value: 10000, description: 'Daily max withdrawal in USD' },
            { key: 'TRANSACTION_FEE_PERCENT', value: 0.1, description: 'Fee percent on trades and transfers' },
        ];
        for (const item of defaults) {
            const exists = await exports.Settings.findOne({ key: item.key });
            if (!exists) {
                await exports.Settings.create(item);
            }
        }
    }
    catch (error) {
        console.error('Failed to seed default settings:', error);
    }
};
exports.seedDefaultSettings = seedDefaultSettings;
