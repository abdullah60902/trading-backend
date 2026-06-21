"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = exports.sendVerificationEmail = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
// Create a transporter or mock it
let transporter = null;
const getTransporter = () => {
    if (transporter)
        return transporter;
    const isConfigured = env_1.env.EMAIL.HOST &&
        env_1.env.EMAIL.USER &&
        env_1.env.EMAIL.USER !== 'mock_user';
    if (isConfigured) {
        transporter = nodemailer_1.default.createTransport({
            host: env_1.env.EMAIL.HOST,
            port: env_1.env.EMAIL.PORT,
            secure: env_1.env.EMAIL.PORT === 465,
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 5000,
            auth: {
                user: env_1.env.EMAIL.USER,
                pass: env_1.env.EMAIL.PASS,
            },
        });
    }
    return transporter;
};
const sendEmail = async (to, subject, html) => {
    const currentTransporter = getTransporter();
    if (currentTransporter) {
        try {
            await currentTransporter.sendMail({
                from: env_1.env.EMAIL.FROM,
                to,
                subject,
                html,
            });
            console.log(`[EMAIL SUCCESS] Sent email to ${to} with subject "${subject}"`);
            return true;
        }
        catch (error) {
            console.error('[EMAIL ERROR] Failed to send email via SMTP:', error);
        }
    }
    // Fallback dev console logger
    console.log(`
=========================================
[DEV EMAIL OUTBOX]
To: ${to}
Subject: ${subject}
=========================================
`);
    return true;
};
exports.sendEmail = sendEmail;
// Ready-to-use mail templates
const sendVerificationEmail = async (email, token) => {
    const verifyUrl = `${env_1.env.CLIENT_URL}/verify-email?token=${token}`;
    const html = `
    <h3>Welcome to CryptoPlatform!</h3>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${verifyUrl}" target="_blank" style="padding: 10px 20px; background: #00e676; color: black; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verify Email</a>
    <p>If button doesn't work, copy-paste this link in your browser:</p>
    <p>${verifyUrl}</p>
    <p>This token will expire in 24 hours.</p>
  `;
    return (0, exports.sendEmail)(email, 'Verify Your Email Address - CryptoPlatform', html);
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = async (email, token) => {
    const resetUrl = `${env_1.env.CLIENT_URL}/reset-password?token=${token}`;
    const html = `
    <h3>Password Reset Request</h3>
    <p>You requested a password reset. Click the button below to set a new password:</p>
    <a href="${resetUrl}" target="_blank" style="padding: 10px 20px; background: #d500f9; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
    <p>If button doesn't work, copy-paste this link in your browser:</p>
    <p>${resetUrl}</p>
    <p>This link will expire in 1 hour.</p>
  `;
    return (0, exports.sendEmail)(email, 'Reset Password - CryptoPlatform', html);
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
