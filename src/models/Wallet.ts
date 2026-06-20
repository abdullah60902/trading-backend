import { Schema, model } from 'mongoose';
import { IWallet } from '../types/models';

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    currency: {
      type: String,
      enum: ['USD', 'BTC', 'ETH', 'USDT'],
      required: true,
    },
    mainBalance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0.00,
    },
    depositBalance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0.00,
    },
    earningsBalance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0.00,
    },
    withdrawalBalance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0.00,
    },
    lockedBalance: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0.00,
    },
    depositAddress: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a user only has one wallet per currency
WalletSchema.index({ userId: 1, currency: 1 }, { unique: true });

export const Wallet = model<IWallet>('Wallet', WalletSchema);
