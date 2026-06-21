"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettingsSchema = exports.tradeSchema = exports.withdrawalSchema = exports.transferSchema = exports.verify2faSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.verifyMobileSchema = exports.sendMobileOtpSchema = exports.verifyEmailSchema = exports.loginSchema = exports.signupSchema = void 0;
const zod_1 = require("zod");
exports.signupSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z
            .string()
            .min(8, 'Password must be at least 8 characters long')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[0-9]/, 'Password must contain at least one number')
            .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
        firstName: zod_1.z.string().min(1, 'First name is required'),
        lastName: zod_1.z.string().min(1, 'Last name is required'),
        phoneNumber: zod_1.z.string().optional(),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.verifyEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token is required'),
    }),
});
exports.sendMobileOtpSchema = zod_1.z.object({
    body: zod_1.z.object({
        phoneNumber: zod_1.z.string().min(10, 'Invalid phone number format'),
    }),
});
exports.verifyMobileSchema = zod_1.z.object({
    body: zod_1.z.object({
        otp: zod_1.z.string().length(6, 'OTP must be exactly 6 digits'),
    }),
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address'),
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token is required'),
        password: zod_1.z
            .string()
            .min(8, 'Password must be at least 8 characters long')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[0-9]/, 'Password must contain at least one number')
            .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    }),
});
exports.verify2faSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().length(6, 'TOTP Token must be 6 digits'),
    }),
});
exports.transferSchema = zod_1.z.object({
    body: zod_1.z.object({
        recipientEmail: zod_1.z.string().email('Invalid email address'),
        currency: zod_1.z.enum(['USD', 'BTC', 'ETH', 'USDT']),
        amount: zod_1.z.number().positive('Amount must be positive'),
    }),
});
exports.withdrawalSchema = zod_1.z.object({
    body: zod_1.z.object({
        currency: zod_1.z.enum(['USD', 'BTC', 'ETH', 'USDT']),
        amount: zod_1.z.number().positive('Amount must be positive'),
        recipientAddress: zod_1.z.string().min(10, 'Recipient address is invalid or too short'),
        twoFactorToken: zod_1.z.string().optional(), // Required if 2FA is active
    }),
});
exports.tradeSchema = zod_1.z.object({
    body: zod_1.z.object({
        fromCurrency: zod_1.z.enum(['USD', 'BTC', 'ETH', 'USDT']),
        toCurrency: zod_1.z.enum(['USD', 'BTC', 'ETH', 'USDT']),
        amount: zod_1.z.number().positive('Amount must be positive'),
    }),
});
exports.updateSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        key: zod_1.z.string().min(1, 'Setting key is required'),
        value: zod_1.z.any(),
    }),
});
