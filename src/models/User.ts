import { Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';
import { IUser } from '../types/models'; // we will define types later

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple null/undefined values
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    mobileOtp: {
      type: String,
    },
    mobileOtpExpires: {
      type: Date,
    },
    twoFactorSecret: {
      type: String,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active',
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    referralPath: {
      type: String,
      default: '',
      index: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    kycDocument: {
      type: String,
      default: '',
    },
    kycStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    notificationPreferences: {
      deposits: { type: Boolean, default: true },
      withdrawals: { type: Boolean, default: true },
      staking: { type: Boolean, default: true },
      referrals: { type: Boolean, default: true },
      salary: { type: Boolean, default: true },
      jackpot: { type: Boolean, default: true },
      announcements: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  const user = this as any;
  if (!user.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password helper method
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const user = this as any;
  return bcrypt.compare(password, user.password);
};

export const User = model<IUser>('User', UserSchema);
