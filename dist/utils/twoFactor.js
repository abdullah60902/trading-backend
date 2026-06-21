"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTwoFactorToken = exports.generateTwoFactorSecret = void 0;
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const generateTwoFactorSecret = async (email) => {
    const secret = speakeasy_1.default.generateSecret({
        name: `CryptoPlatform:${email}`,
        issuer: 'CryptoPlatform',
    });
    const qrCodeUrl = await qrcode_1.default.toDataURL(secret.otpauth_url || '');
    return {
        secret: secret.base32,
        qrCodeUrl,
    };
};
exports.generateTwoFactorSecret = generateTwoFactorSecret;
const verifyTwoFactorToken = (secret, token) => {
    return speakeasy_1.default.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1, // Allow +/- 30 seconds clock drift
    });
};
exports.verifyTwoFactorToken = verifyTwoFactorToken;
