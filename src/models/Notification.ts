import { Schema, model } from 'mongoose';
import { INotification } from '../types/models';

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'security'],
      default: 'info',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 2592000, // Automagically delete notifications after 30 days
    },
  }
);

export const Notification = model<INotification>('Notification', NotificationSchema);
