import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/cryptodb',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_key',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_key',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  EMAIL: {
    HOST: process.env.EMAIL_HOST || '',
    PORT: parseInt(process.env.EMAIL_PORT || '2525', 10),
    USER: process.env.EMAIL_USER || 'mock_user',
    PASS: process.env.EMAIL_PASS || 'mock_pass',
    FROM: process.env.EMAIL_FROM || 'noreply@cryptoplatform.com',
  },
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'mock_cloud_name',
    API_KEY: process.env.CLOUDINARY_API_KEY || 'mock_api_key',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || 'mock_api_secret',
  }
};
