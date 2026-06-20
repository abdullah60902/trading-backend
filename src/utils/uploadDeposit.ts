import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

// Cloudinary storage for deposit screenshots
const depositScreenshotStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cryptoplatform/deposits',
    allowed_formats: ['jpeg', 'jpg', 'png', 'webp'],
    public_id: (req: any, file: any) => `deposit_${req.user?.id}_${Date.now()}`,
  } as any,
});

export const uploadDepositScreenshot = multer({
  storage: depositScreenshotStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('screenshot');
