import { Schema, model } from 'mongoose';
import { ITransaction } from '../types/models';

const TransactionSchema = new Schema<ITransaction>(
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
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'transfer', 'trade', 'staking', 'earnings'],
      required: true,
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
      enum: ['pending', 'completed', 'failed', 'rejected', 'closed'],
      default: 'pending',
      index: true,
    },
    txHash: {
      type: String,
      unique: true,
      sparse: true,
    },
    recipientAddress: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);
