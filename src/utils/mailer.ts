import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Resend client
let resendClient: Resend | null = null;

// Fallback SMTP transporter
let smtpTransporter: nodemailer.Transporter | null = null;
let smtpConnected = false;

// Initialize Resend client if API key is available
const getResendClient = () => {
  if (resendClient) return resendClient;
  
  if (env.RESEND_API_KEY) {
    resendClient = new Resend(env.RESEND_API_KEY);
    console.log(`[EMAIL] ✓ Resend API client initialized`);
    return resendClient;
  }
  return null;
};

// Initialize SMTP transporter as fallback
const getSMTPTransporter = () => {
  if (smtpTransporter) return smtpTransporter;

  const isConfigured =
    env.EMAIL.HOST &&
    env.EMAIL.USER &&
    env.EMAIL.USER !== 'mock_user';

  if (!isConfigured) return null;

  const isSSL = env.EMAIL.PORT === 465;
  
  const transportConfig: any = {
    host: env.EMAIL.HOST,
    port: env.EMAIL.PORT,
    secure: isSSL,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    rejectUnauthorized: false,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 14,
    auth: {
      user: env.EMAIL.USER,
      pass: env.EMAIL.PASS,
    },
  };
  
  smtpTransporter = nodemailer.createTransport(transportConfig);
  
  console.log(`[EMAIL] ✓ SMTP Transporter created: ${env.EMAIL.HOST}:${env.EMAIL.PORT} (${isSSL ? 'SSL' : 'TLS'})`);
  
  // Verify connection once
  smtpTransporter.verify((error: any, success: boolean) => {
    if (error) {
      console.error(`[EMAIL WARNING] SMTP verification failed:`, error.message);
      smtpConnected = false;
    } else {
      console.log(`[EMAIL ✓] SMTP connection verified`);
      smtpConnected = true;
    }
  });
  
  return smtpTransporter;
};

export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  const isProduction = env.NODE_ENV === 'production';
  
  console.log(`[EMAIL] Attempting to send email to: ${to}`);
  console.log(`[EMAIL DEBUG] RESEND_API_KEY available: ${!!env.RESEND_API_KEY}`);

  // Try Resend first (preferred method)
  const resend = getResendClient();
  if (resend) {
    try {
      console.log(`[EMAIL] Sending via Resend API...`);
      const response = await resend.emails.send({
        from: env.EMAIL.FROM || 'onboarding@resend.dev',
        to,
        subject,
        html,
      });

      if (response.error) {
        console.error(`[EMAIL ERROR] Resend API error:`, response.error);
        // Fall through to SMTP fallback
      } else {
        console.log(`[EMAIL ✓] Successfully sent via Resend to ${to}`);
        console.log(`[EMAIL ✓] Message ID: ${response.data?.id}`);
        return true;
      }
    } catch (error: any) {
      console.error(`[EMAIL ERROR] Resend API failed:`, error.message);
      // Fall through to SMTP fallback
    }
  }

  // Fallback to SMTP
  const transporter = getSMTPTransporter();
  if (transporter) {
    try {
      console.log(`[EMAIL] Resend unavailable, trying SMTP fallback...`);
      
      // Retry logic with exponential backoff
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const info = await transporter.sendMail({
            from: env.EMAIL.FROM,
            to,
            subject,
            html,
          });
          console.log(`[EMAIL ✓] Successfully sent via SMTP to ${to}`);
          console.log(`[EMAIL ✓] Message ID: ${info.messageId}`);
          return true;
        } catch (error: any) {
          attempts++;
          
          if (error.code === 'ETIMEDOUT' || error.code === 'EHOSTUNREACH' || error.message.includes('timeout')) {
            console.warn(`[EMAIL WARNING] SMTP timeout attempt ${attempts}/${maxAttempts}: ${error.message}`);
            
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
              continue;
            }
          }
          throw error;
        }
      }
    } catch (error: any) {
      console.error(`[EMAIL ERROR] SMTP failed for ${to}:`, error.message);
      // Fall through to console log
    }
  }

  // Fallback to dev console (non-production only)
  if (!isProduction) {
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
  }

  // Production mode without email service = failure
  console.error(`[EMAIL ERROR] No email service available (Resend API key missing and SMTP not configured)`);
  return false;
};

// Email templates
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
