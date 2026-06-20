import { Schema, model } from 'mongoose';
import { ISupportTicket } from '../types/models';

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: false,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'replied', 'closed'],
      default: 'open',
      index: true,
    },
    replies: [
      {
        sender: {
          type: String,
          enum: ['user', 'admin'],
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const SupportTicket = model<ISupportTicket>('SupportTicket', SupportTicketSchema);
