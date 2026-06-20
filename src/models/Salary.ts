import { Schema, model } from 'mongoose';
import { ISalary } from '../types/models';

const SalarySchema = new Schema<ISalary>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    monthlyAmount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'USDT',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    lastPaidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Salary = model<ISalary>('Salary', SalarySchema);
