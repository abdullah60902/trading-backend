"use strict";
/**
 * Application startup wrapper
 * Sets up environment variables before the main server starts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env file first
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
// Ensure RESEND_API_KEY is available for email service
// This fallback is necessary because render.yaml variables sometimes don't sync
if (!process.env.RESEND_API_KEY) {
    process.env.RESEND_API_KEY = 're_Xre8TrWD_J2hPYj5Rt9DazU1LLBeiEvyD';
    console.log('[STARTUP] ✓ RESEND_API_KEY injected from startup wrapper');
}
else {
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
Promise.resolve().then(() => __importStar(require('./server')));
