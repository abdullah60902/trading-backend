/**
 * Application startup wrapper
 * Sets up environment variables before the main server starts
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env file first
dotenv.config({ path: path.join(__dirname, '../.env') });

// Ensure RESEND_API_KEY is available for email service
// This fallback is necessary because render.yaml variables sometimes don't sync
if (!process.env.RESEND_API_KEY) {
  process.env.RESEND_API_KEY = 're_Xre8TrWD_J2hPYj5Rt9DazU1LLBeiEvyD';
  console.log('[STARTUP] ✓ RESEND_API_KEY injected from startup wrapper');
} else {
  console.log('[STARTUP] ✓ RESEND_API_KEY loaded from environment');
}

// Ensure EMAIL_FROM uses Resend-verified domain
if (!process.env.EMAIL_FROM) {
  process.env.EMAIL_FROM = 'onboarding@resend.dev';
  console.log('[STARTUP] ✓ EMAIL_FROM set to Resend verified domain');
}

// Ensure fallback SMTP is configured
if (!process.env.EMAIL_HOST) {
  process.env.EMAIL_HOST = 'smtp.gmail.com';
  process.env.EMAIL_PORT = '465';
  process.env.EMAIL_USER = 'info.bright.future.ser@gmail.com';
  process.env.EMAIL_PASS = 'frncxlgzkubsrdkn';
  console.log('[STARTUP] ✓ Gmail SMTP fallback configured');
}

console.log('[STARTUP] Environment variables ready. Starting server...');

// Now import and start the server
import('./server');
