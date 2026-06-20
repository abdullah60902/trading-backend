import { Schema, model } from 'mongoose';
import { IAdminLog } from '../types/models';

const AdminLogSchema = new Schema<IAdminLog>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    ipAddress: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  }
);

export const AdminLog = model<IAdminLog>('AdminLog', AdminLogSchema);
