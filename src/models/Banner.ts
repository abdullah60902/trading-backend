import { Schema, model } from 'mongoose';
import { IBanner } from '../types/models';

const BannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    linkUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Banner = model<IBanner>('Banner', BannerSchema);
