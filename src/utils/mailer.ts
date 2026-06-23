import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Create a transporter or mock it
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const isConfigured =
    env.EMAIL.HOST &&
    env.EMAIL.USER &&
    env.EMAIL.USER !== 'mock_user';

  if (isConfigured) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL.HOST,
      port: env.EMAIL.PORT,
      secure: env.EMAIL.PORT === 465,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      auth: {
        user: env.EMAIL.USER,
        pass: env.EMAIL.PASS,
      },
    });
  }
  return transporter;
};

export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  const currentTransporter = getTransporter();
  const isProduction = env.NODE_ENV === 'production';
  
  console.log(`[EMAIL] Attempting to send to ${to}`);
  console.log(`[EMAIL] SMTP configured: ${!!currentTransporter}`);
  console.log(`[EMAIL] Using transporter: ${currentTransporter ? 'SMTP' : 'Console (DEV MODE)'}`);

  if (currentTransporter) {
    try {
      const info = await currentTransporter.sendMail({
        from: env.EMAIL.FROM,
        to,
        subject,
        html,
      });
      console.log(`[EMAIL ✓] Successfully sent to ${to}`);
      console.log(`[EMAIL ✓] Message ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error(`[EMAIL ERROR] SMTP send failed for ${to}:`, error.message);
      console.error(`[EMAIL ERROR] Full error:`, error);
      // Don't fallback to console on production
      if (isProduction) {
        return false;
      }
    }
  }

  // Fallback dev console logger (non-production only)
  console.log(`
=========================================
[DEV EMAIL OUTBOX]
To: ${to}
Subject: ${subject}
=========================================
${html}
=========================================
`);
  return true;
};

// Ready-to-use mail templates
export const sendVerificationEmail = async (email: string, token: string): Promise<boolean> => {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;
  const html = `
    <h3>Welcome to CryptoPlatform!</h3>
    <p>Please verify your email by clicking the link below:</p>
    <a href="${verifyUrl}" target="_blank" style="padding: 10px 20px; background: #00e676; color: black; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verify Email</a>
    <p>If button doesn't work, copy-paste this link in your browser:</p>
    <p>${verifyUrl}</p>
    <p>This token will expire in 24 hours.</p>
  `;
  return sendEmail(email, 'Verify Your Email Address - CryptoPlatform', html);
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<boolean> => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
  const html = `
    <h3>Password Reset Request</h3>
    <p>You requested a password reset. Click the button below to set a new password:</p>
    <a href="${resetUrl}" target="_blank" style="padding: 10px 20px; background: #d500f9; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
    <p>If button doesn't work, copy-paste this link in your browser:</p>
    <p>${resetUrl}</p>
    <p>This link will expire in 1 hour.</p>
  `;
  return sendEmail(email, 'Reset Password - CryptoPlatform', html);
};
