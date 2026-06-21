"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = exports.sendVerificationEmail = exports.sendEmail = void 0;
const env_1 = require("../config/env");
const sendEmail = async (to, subject, html) => {
    try {
        // User provided Resend Token
        const resendApiKey = process.env.RESEND_API_KEY || 're_RCMpAzfw_ANXQKMZ1DDKyfyr8pWZjd5VQ';
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`
            },
            body: JSON.stringify({
                from: 'CryptoPlatform <onboarding@resend.dev>',
                to: [to],
                subject: subject,
                html: html
            })
        });
        const data = await response.json();
        if (response.ok) {
            console.log(`[EMAIL SUCCESS] Sent via Resend to ${to}:`, data);
            return true;
        }
        else {
            console.error('[EMAIL ERROR] Resend API failed:', data);
        }
    }
    catch (error) {
        console.error('[EMAIL ERROR] Failed to send email via HTTP:', error);
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
