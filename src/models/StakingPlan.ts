import { Schema, model, Document, Types } from 'mongoose';

export interface IStakingPlan extends Document {
  userId: Types.ObjectId;
  walletId: Types.ObjectId;
  currency: 'USD' | 'BTC' | 'ETH' | 'USDT';
  lockedCapital: Types.Decimal128;          // Amount locked — NEVER changes
  monthlyRatePct: number;                   // Fixed at 10
  totalRewardLimit: Types.Decimal128;       // lockedCapital × 3
  totalRewardEarned: Types.Decimal128;      // Accumulates with each payout
  lastPayoutAt: Date;
  status: 'active' | 'completed';
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StakingPlanSchema = new Schema<IStakingPlan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    currency: {
      type: String,
      enum: ['USD', 'BTC', 'ETH', 'USDT'],
      required: true,
    },
    lockedCapital: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    monthlyRatePct: {
      type: Number,
      default: 10,
    },
    totalRewardLimit: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    totalRewardEarned: {
      type: Schema.Types.Decimal128,
      default: 0,
    },
    lastPayoutAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Useful compound index for admin queries
StakingPlanSchema.index({ userId: 1, status: 1 });

export const StakingPlan = model<IStakingPlan>('StakingPlan', StakingPlanSchema);
