import { Schema, model } from 'mongoose';
import { ISettings } from '../types/models';

const SettingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true }
  }
);

export const Settings = model<ISettings>('Settings', SettingsSchema);
// Export a function to seed default settings if they don't exist
export const seedDefaultSettings = async (): Promise<void> => {
  try {
    const defaults = [
      { key: 'MAINTENANCE_MODE', value: false, description: 'Disable all non-admin app access' },
      { key: 'ALLOW_REGISTRATION', value: true, description: 'Allow new user registration' },
      { key: 'WITHDRAWAL_LIMIT_USD', value: 10000, description: 'Daily max withdrawal in USD' },
      { key: 'TRANSACTION_FEE_PERCENT', value: 0.1, description: 'Fee percent on trades and transfers' },
    ];
    for (const item of defaults) {
      const exists = await Settings.findOne({ key: item.key });
      if (!exists) {
        await Settings.create(item);
      }
    }
  } catch (error) {
    console.error('Failed to seed default settings:', error);
  }
};
