import { Schema, model } from 'mongoose';
import { IStakingReward } from '../types/models';

const StakingRewardSchema = new Schema<IStakingReward>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'StakingPlan',
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
    rewardDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const StakingReward = model<IStakingReward>('StakingReward', StakingRewardSchema);
