import nodemailer from 'nodemailer';
import { env } from '../config/env';

// ─── Transporter ──────────────────────────────────────────────────────────────
let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,          // ✅ 587 STARTTLS — Render par kaam karta hai
    secure: false,      // ✅ false for STARTTLS (465=true SSL, 587=false TLS)
    auth: {
      user: env.EMAIL.USER,
      pass: env.EMAIL.PASS,
    },
    tls: {
      rejectUnauthorized: false,  // cloud servers ke liye
    },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });

  console.log('[EMAIL] ✓ Nodemailer transporter ready (Gmail SMTP port 587)');
  return transporter;
};

// ─── Core Send Function ───────────────────────────────────────────────────────
export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  const isProduction = env.NODE_ENV === 'production';

  console.log(`[EMAIL] Sending email to: ${to}`);

  // Dev mode — agar Gmail configure nahi to console mein print karo
  if (!env.EMAIL.USER || env.EMAIL.USER === 'mock_user') {
    if (!isProduction) {
      console.log(`\n=== DEV EMAIL ===\nTo: ${to}\nSubject: ${subject}\n=================\n${html}\n`);
      return true;
    }
    console.error('[EMAIL] ❌ EMAIL_USER not set!');
    return false;
  }

  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: env.EMAIL.FROM || `"Crypto Platform" <${env.EMAIL.USER}>`,
      to,
      subject,
      html,
    });

    console.log(`[EMAIL] ✓ Email sent to ${to} | ID: ${info.messageId}`);
    return true;
  } catch (err: any) {
    console.error(`[EMAIL] ❌ Failed to send to ${to}:`, err.message);

    // Dev fallback
    if (!isProduction) {
      console.log(`\n=== DEV EMAIL (fallback) ===\nTo: ${to}\nSubject: ${subject}\n===========================\n${html}\n`);
      return true;
    }
    return false;
  }
};

// ─── Email Templates ──────────────────────────────────────────────────────────
export const sendVerificationEmail = async (email: string, token: string): Promise<boolean> => {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background: #0f0f1a; color: #ffffff; padding: 40px;">
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
        <p style="color:#555;font-size:12px;">Link expires in 24 hours. If you did not sign up, ignore this email.</p>
      </div>
    </body>
    </html>
  `;
  return sendEmail(email, 'Verify Your Email - CryptoPlatform', html);
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<boolean> => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background: #0f0f1a; color: #ffffff; padding: 40px;">
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
        <p style="color:#555;font-size:12px;">Link expires in 1 hour. If you did not request this, ignore this email.</p>
      </div>
    </body>
    </html>
  `;
  return sendEmail(email, 'Reset Password - CryptoPlatform', html);
};
