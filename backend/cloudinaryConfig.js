import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

// Configure Cloudinary with API credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUDINARY_CLOUD_NAME_HERE',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer to store uploaded files in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

/**
 * Uploads a file buffer directly to Cloudinary
 * @param {Buffer} fileBuffer The file buffer from multer memory storage
 * @returns {Promise<object>} The Cloudinary response object
 */
const uploadToCloudinary = (fileBuffer, folder = 'thoiu-locket') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [{ width: 800, crop: 'limit', quality: 'auto' }]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export { upload, uploadToCloudinary };
