import { Schema, model } from 'mongoose';
import { IWithdrawal } from '../types/models';

const WithdrawalSchema = new Schema<IWithdrawal>(
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
    recipientAddress: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'processing'],
      default: 'pending',
      index: true,
    },
    txHash: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Withdrawal = model<IWithdrawal>('Withdrawal', WithdrawalSchema);
