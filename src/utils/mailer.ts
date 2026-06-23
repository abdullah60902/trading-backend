import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Create a transporter or mock it
let transporter: nodemailer.Transporter | null = null;
let verifyConnected = false;

const getTransporter = () => {
  if (transporter) return transporter;

  // DEBUG: Log environment variables
  console.log(`[EMAIL DEBUG] RESEND_API_KEY is: "${env.RESEND_API_KEY}"`);
  console.log(`[EMAIL DEBUG] EMAIL.HOST is: "${env.EMAIL.HOST}"`);

  // Prefer Resend over SMTP for reliability on Render
  if (env.RESEND_API_KEY) {
    // Using Resend's SMTP bridge
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: env.RESEND_API_KEY,
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
    });
    console.log(`[EMAIL] ✓ Resend transporter created`);
    
    if (!verifyConnected) {
      transporter.verify((error: any, success: boolean) => {
        if (error) {
          console.error(`[EMAIL WARNING] Resend verification failed:`, error.message);
        } else {
          console.log(`[EMAIL ✓] Resend connection verified`);
          verifyConnected = true;
        }
      });
    }
    return transporter;
  }

  // Fallback to SMTP if available
  const isConfigured =
    env.EMAIL.HOST &&
    env.EMAIL.USER &&
    env.EMAIL.USER !== 'mock_user';

  if (isConfigured) {
    // For port 465: use SSL (secure: true)
    // For port 587: use TLS (secure: false, STARTTLS enabled)
    const isSSL = env.EMAIL.PORT === 465;
    
    transporter = nodemailer.createTransport({
      host: env.EMAIL.HOST,
      port: env.EMAIL.PORT,
      secure: isSSL, // true for 465 (SSL), false for 587 (STARTTLS)
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
    });
    console.log(`[EMAIL] ✓ SMTP Transporter created: ${env.EMAIL.HOST}:${env.EMAIL.PORT} (${isSSL ? 'SSL' : 'TLS'})`);
    
    // Verify connection once
    if (!verifyConnected) {
      transporter.verify((error: any, success: boolean) => {
        if (error) {
          console.error(`[EMAIL WARNING] Connection verification failed:`, error.message);
          verifyConnected = false;
        } else {
          console.log(`[EMAIL ✓] SMTP connection verified successfully`);
          verifyConnected = true;
        }
      });
    }
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
      // Retry logic with exponential backoff
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
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
          attempts++;
          
          // Check if it's a timeout error
          if (error.code === 'ETIMEDOUT' || error.code === 'EHOSTUNREACH' || error.message.includes('timeout')) {
            console.warn(`[EMAIL WARNING] Timeout attempt ${attempts}/${maxAttempts}: ${error.message}`);
            
            if (attempts < maxAttempts) {
              // Wait before retrying (exponential backoff: 2s, 4s)
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
              continue;
            }
          }
          
          throw error;
        }
      }
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
