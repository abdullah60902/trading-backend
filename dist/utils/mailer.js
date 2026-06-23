"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = exports.sendVerificationEmail = exports.sendEmail = void 0;
const https_1 = __importDefault(require("https"));
const env_1 = require("../config/env");
// ─── Brevo HTTP API (No SMTP - works on all cloud providers) ─────────────────
const sendViaBrevo = (to, subject, html) => {
    return new Promise((resolve) => {
        if (!env_1.env.BREVO_API_KEY) {
            console.warn('[EMAIL] ⚠️  BREVO_API_KEY not set.');
            resolve(false);
            return;
        }
        const senderEmail = env_1.env.EMAIL.USER || 'info.bright.future.ser@gmail.com';
        const payload = JSON.stringify({
            sender: { name: 'Crypto Platform', email: senderEmail },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        });
        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': env_1.env.BREVO_API_KEY,
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(payload),
            },
        };
        const req = https_1.default.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(`[EMAIL] ✓ Email sent via Brevo to ${to} | ID: ${parsed.messageId}`);
                        resolve(true);
                    }
                    else {
                        console.error(`[EMAIL] ❌ Brevo error [${res.statusCode}]:`, JSON.stringify(parsed));
                        resolve(false);
                    }
                }
                catch {
                    console.error('[EMAIL] ❌ Failed to parse Brevo response');
                    resolve(false);
                }
            });
        });
        req.on('error', (err) => {
            console.error('[EMAIL] ❌ Brevo request error:', err.message);
            resolve(false);
        });
        req.write(payload);
        req.end();
    });
};
// ─── Core Send Function ───────────────────────────────────────────────────────
const sendEmail = async (to, subject, html) => {
    const isProduction = env_1.env.NODE_ENV === 'production';
    console.log(`[EMAIL] Attempting to send email to: ${to}`);
    console.log(`[EMAIL DEBUG] BREVO_API_KEY available: ${!!env_1.env.BREVO_API_KEY}`);
    if (!env_1.env.BREVO_API_KEY) {
        if (!isProduction) {
            console.log(`\n=== DEV EMAIL ===\nTo: ${to}\nSubject: ${subject}\n=================\n${html}\n`);
            return true;
        }
        console.error('[EMAIL] ❌ BREVO_API_KEY not configured in production!');
        return false;
    }
    return sendViaBrevo(to, subject, html);
};
exports.sendEmail = sendEmail;
// ─── Email Templates ──────────────────────────────────────────────────────────
const sendVerificationEmail = async (email, token) => {
    const verifyUrl = `${env_1.env.CLIENT_URL}/verify-email?token=${token}`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background: #0f0f1a; padding: 40px;">
      <div style="max-width: 500px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; padding: 32px;">
        <h2 style="color: #00e676; margin-top: 0;">✅ Verify Your Email</h2>
        <p style="color: #cccccc;">Welcome to <strong>CryptoPlatform</strong>! Please verify your email to activate your account.</p>
        <a href="${verifyUrl}" target="_blank"
          style="display:inline-block;margin:20px 0;padding:14px 28px;background:#00e676;color:#000;
                 text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
          Verify Email
        </a>
        <p style="color:#888;font-size:13px;">Button not working? Copy this link:</p>
        <p style="word-break:break-all;color:#00e676;font-size:12px;">${verifyUrl}</p>
        <hr style="border-color:#333;margin:24px 0;">
        <p style="color:#555;font-size:12px;">Link expires in 24 hours.</p>
      </div>
    </body>
    </html>
  `;
    return (0, exports.sendEmail)(email, 'Verify Your Email - CryptoPlatform', html);
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = async (email, token) => {
    const resetUrl = `${env_1.env.CLIENT_URL}/reset-password?token=${token}`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background: #0f0f1a; padding: 40px;">
      <div style="max-width: 500px; margin: 0 auto; background: #1a1a2e; border-radius: 12px; padding: 32px;">
        <h2 style="color: #d500f9; margin-top: 0;">🔑 Password Reset</h2>
        <p style="color: #cccccc;">You requested a password reset for your <strong>CryptoPlatform</strong> account.</p>
        <a href="${resetUrl}" target="_blank"
          style="display:inline-block;margin:20px 0;padding:14px 28px;background:#d500f9;color:#fff;
                 text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
          Reset Password
        </a>
        <p style="color:#888;font-size:13px;">Button not working? Copy this link:</p>
        <p style="word-break:break-all;color:#d500f9;font-size:12px;">${resetUrl}</p>
        <hr style="border-color:#333;margin:24px 0;">
        <p style="color:#555;font-size:12px;">Link expires in 1 hour.</p>
      </div>
    </body>
    </html>
  `;
    return (0, exports.sendEmail)(email, 'Reset Password - CryptoPlatform', html);
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
