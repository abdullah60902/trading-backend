import { Schema, model } from 'mongoose';
import { IDeposit } from '../types/models';

const DepositSchema = new Schema<IDeposit>(
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
      index: true,
    },
    currency: {
      type: String,
      required: true,
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    fee: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0.00,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    txHash: {
      type: String,
      sparse: true,
    },
    screenshotUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Deposit = model<IDeposit>('Deposit', DepositSchema);
