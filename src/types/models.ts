import { Document, Types } from 'mongoose';

export interface IAdmin extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'superadmin' | 'admin';
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  refreshToken?: string;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  isMobileVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  mobileOtp?: string;
  mobileOtpExpires?: Date;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  refreshToken?: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
  referralCode: string;
  referredBy?: Types.ObjectId;
  referralPath: string;
  profilePicture?: string;
  kycDocument?: string;
  kycStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  notificationPreferences?: {
    deposits: boolean;
    withdrawals: boolean;
    staking: boolean;
    referrals: boolean;
    salary: boolean;
    jackpot: boolean;
    announcements: boolean;
    security: boolean;
  };
}

export interface IWallet extends Document {
  userId: Types.ObjectId;
  currency: 'USD' | 'BTC' | 'ETH' | 'USDT';
  mainBalance: Types.Decimal128;
  depositBalance: Types.Decimal128;
  earningsBalance: Types.Decimal128;
  withdrawalBalance: Types.Decimal128;
  lockedBalance: Types.Decimal128;
  depositAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction extends Document {
  userId: Types.ObjectId;
  walletId: Types.ObjectId;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'trade' | 'staking' | 'earnings';
  currency: string;
  amount: Types.Decimal128;
  fee: Types.Decimal128;
  status: 'pending' | 'completed' | 'failed' | 'rejected' | 'closed';
  txHash?: string;
  recipientAddress?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification extends Document {
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'security';
  isRead: boolean;
  createdAt: Date;
}

export interface IUserLog extends Document {
  userId: Types.ObjectId;
  action: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo: string;
  location: string;
  createdAt: Date;
}

export interface IAdminLog extends Document {
  adminId: Types.ObjectId;
  action: string;
  targetUserId?: Types.ObjectId;
  ipAddress: string;
  details: string;
  createdAt: Date;
}

export interface ISettings extends Document {
  key: string;
  value: any;
  description: string;
  updatedBy: Types.ObjectId;
  updatedAt: Date;
}

export interface ISupportTicket extends Document {
  userId: Types.ObjectId;
  subject: string;
  message: string;
  status: 'open' | 'replied' | 'closed';
  replies: Array<{
    sender: 'user' | 'admin';
    message: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface IBanner extends Document {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface IJackpot extends Document {
  round: number;
  poolAmount: Types.Decimal128;
  status: 'open' | 'drawn';
  participants: Types.ObjectId[];
  winnerId?: Types.ObjectId;
  drawnAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISalary extends Document {
  userId: Types.ObjectId;
  monthlyAmount: Types.Decimal128;
  currency: string;
  status: 'active' | 'inactive';
  lastPaidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeposit extends Document {
  userId: Types.ObjectId;
  walletId: Types.ObjectId;
  currency: string;
  amount: Types.Decimal128;
  fee: Types.Decimal128;
  status: 'pending' | 'approved' | 'rejected';
  txHash?: string;
  screenshotUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWithdrawal extends Document {
  userId: Types.ObjectId;
  walletId: Types.ObjectId;
  currency: string;
  amount: Types.Decimal128;
  fee: Types.Decimal128;
  recipientAddress: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  txHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStakingReward extends Document {
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  currency: string;
  amount: Types.Decimal128;
  rewardDate: Date;
  createdAt: Date;
}

export interface IReferral extends Document {
  referrerId: Types.ObjectId;
  referredUserId: Types.ObjectId;
  status: 'pending' | 'active';
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeamStructure extends Document {
  userId: Types.ObjectId;
  uplineId: Types.ObjectId;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEarning extends Document {
  userId: Types.ObjectId;
  type: 'daily' | 'referral' | 'team' | 'rank' | 'salary' | 'jackpot' | 'staking';
  currency: string;
  amount: Types.Decimal128;
  sourceId?: Types.ObjectId; // E.g., the planId, or the referredUserId that generated this
  createdAt: Date;
  updatedAt: Date;
}
