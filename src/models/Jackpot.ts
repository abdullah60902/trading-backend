import { Schema, model } from 'mongoose';
import { IJackpot } from '../types/models';

const JackpotSchema = new Schema<IJackpot>(
  {
    round: {
      type: Number,
      required: true,
      unique: true,
    },
    poolAmount: {
      type: Schema.Types.Decimal128,
      default: 0,
    },
    status: {
      type: String,
      enum: ['open', 'drawn'],
      default: 'open',
      index: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    winnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    drawnAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Jackpot = model<IJackpot>('Jackpot', JackpotSchema);
