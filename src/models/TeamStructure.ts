import { Schema, model } from 'mongoose';
import { ITeamStructure } from '../types/models';

const TeamStructureSchema = new Schema<ITeamStructure>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    uplineId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    level: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// A user shouldn't be under the same upline twice
TeamStructureSchema.index({ userId: 1, uplineId: 1 }, { unique: true });

export const TeamStructure = model<ITeamStructure>('TeamStructure', TeamStructureSchema);
