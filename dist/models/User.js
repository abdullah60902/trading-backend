"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const bcrypt_1 = __importDefault(require("bcrypt"));
const UserSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        unique: true,
        sparse: true, // Allow multiple null/undefined values
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    isEmailVerified: {
        type: Boolean,
        default: true,
    },
    isMobileVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: {
        type: String,
    },
    emailVerificationExpires: {
        type: Date,
    },
    mobileOtp: {
        type: String,
    },
    mobileOtpExpires: {
        type: Date,
    },
    twoFactorSecret: {
        type: String,
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false,
    },
    refreshToken: {
        type: String,
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'active',
    },
    referralCode: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    referredBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    referralPath: {
        type: String,
        default: '',
        index: true,
    },
    profilePicture: {
        type: String,
        default: '',
    },
    kycDocument: {
        type: String,
        default: '',
    },
    kycStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none',
    },
    notificationPreferences: {
        deposits: { type: Boolean, default: true },
        withdrawals: { type: Boolean, default: true },
        staking: { type: Boolean, default: true },
        referrals: { type: Boolean, default: true },
        salary: { type: Boolean, default: true },
        jackpot: { type: Boolean, default: true },
        announcements: { type: Boolean, default: true },
        security: { type: Boolean, default: true },
    },
}, {
    timestamps: true,
});
// Hash password before saving
UserSchema.pre('save', async function (next) {
    const user = this;
    if (!user.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt_1.default.genSalt(10);
        user.password = await bcrypt_1.default.hash(user.password, salt);
        next();
    }
    catch (error) {
        next(error);
    }
});
// Compare password helper method
UserSchema.methods.comparePassword = async function (password) {
    const user = this;
    return bcrypt_1.default.compare(password, user.password);
};
exports.User = (0, mongoose_1.model)('User', UserSchema);
