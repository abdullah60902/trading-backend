import { Schema, model } from 'mongoose';
import { IReferral } from '../types/models';

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referredUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active'],
      default: 'pending',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Referral = model<IReferral>('Referral', ReferralSchema);
