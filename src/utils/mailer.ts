import { env } from '../config/env';

// ─── Brevo (Sendinblue) HTTP API ──────────────────────────────────────────────
// Free: 300 emails/day | No domain needed | Works on Render
// Signup: brevo.com → Settings → API Keys → Create API Key

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendViaBrevo = async (
  to: string,
  subject: string,
  html: string
): Promise<boolean> => {
  if (!env.BREVO_API_KEY) {
    console.warn('[EMAIL] ⚠️  BREVO_API_KEY not set.');
    return false;
  }

  const payload = {
    sender: { name: 'Crypto Platform', email: env.EMAIL.USER || 'info.bright.future.ser@gmail.com' },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`[EMAIL] ❌ Brevo error:`, JSON.stringify(errorData));
    return false;
  }

  const data: any = await response.json();
  console.log(`[EMAIL] ✓ Email sent via Brevo to ${to} | ID: ${data?.messageId}`);
  return true;
};

// ─── Core Send Function ───────────────────────────────────────────────────────
export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  const isProduction = env.NODE_ENV === 'production';

  console.log(`[EMAIL] Attempting to send email to: ${to}`);

  // Dev fallback — print to console if Brevo not configured
  if (!env.BREVO_API_KEY) {
    if (!isProduction) {
      console.log(`\n=== DEV EMAIL ===\nTo: ${to}\nSubject: ${subject}\n=================\n${html}\n`);
      return true;
    }
    console.error('[EMAIL] ❌ BREVO_API_KEY not set in production!');
    return false;
  }

  try {
    return await sendViaBrevo(to, subject, html);
  } catch (err: any) {
    console.error(`[EMAIL] ❌ Exception:`, err.message);
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
        <p style="color:#555;font-size:12px;">Link expires in 1 hour. If you did not request this, ignore this email.</p>
      </div>
    </body>
    </html>
  `;
  return sendEmail(email, 'Reset Password - CryptoPlatform', html);
};
