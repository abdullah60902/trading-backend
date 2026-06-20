import { Schema, model } from 'mongoose';
import { IEarning } from '../types/models';

const EarningSchema = new Schema<IEarning>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['daily', 'referral', 'team', 'rank', 'salary', 'jackpot', 'staking'],
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
    sourceId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
  }
);

export const Earning = model<IEarning>('Earning', EarningSchema);
