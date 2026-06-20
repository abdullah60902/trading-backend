import { Schema, model } from 'mongoose';
import { IUserLog } from '../types/models';

const UserLogSchema = new Schema<IUserLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    deviceInfo: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: 'Unknown',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  }
);

export const UserLog = model<IUserLog>('UserLog', UserLogSchema);
