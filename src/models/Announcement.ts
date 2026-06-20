import { Schema, model } from 'mongoose';
import { IAnnouncement } from '../types/models';

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Announcement = model<IAnnouncement>('Announcement', AnnouncementSchema);
