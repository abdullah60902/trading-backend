import { z } from 'zod';

export const signupSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phoneNumber: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
  }),
});

export const sendMobileOtpSchema = z.object({
  body: z.object({
    phoneNumber: z.string().min(10, 'Invalid phone number format'),
  }),
});

export const verifyMobileSchema = z.object({
  body: z.object({
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  }),
});

export const verify2faSchema = z.object({
  body: z.object({
    token: z.string().length(6, 'TOTP Token must be 6 digits'),
  }),
});

export const transferSchema = z.object({
  body: z.object({
    recipientEmail: z.string().email('Invalid email address'),
    currency: z.enum(['USD', 'BTC', 'ETH', 'USDT']),
    amount: z.number().positive('Amount must be positive'),
  }),
});

export const withdrawalSchema = z.object({
  body: z.object({
    currency: z.enum(['USD', 'BTC', 'ETH', 'USDT']),
    amount: z.number().positive('Amount must be positive'),
    recipientAddress: z.string().min(10, 'Recipient address is invalid or too short'),
    twoFactorToken: z.string().optional(), // Required if 2FA is active
  }),
});

export const tradeSchema = z.object({
  body: z.object({
    fromCurrency: z.enum(['USD', 'BTC', 'ETH', 'USDT']),
    toCurrency: z.enum(['USD', 'BTC', 'ETH', 'USDT']),
    amount: z.number().positive('Amount must be positive'),
  }),
});

export const updateSettingsSchema = z.object({
  body: z.object({
    key: z.string().min(1, 'Setting key is required'),
    value: z.any(),
  }),
});
