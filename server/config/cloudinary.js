const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

let uploadCloudinary;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    // Configure Cloudinary
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Configure Multer Storage for Cloudinary
    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'checklists',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            public_id: (req, file) => `checklist-${Date.now()}-${file.fieldname}`
        },
    });

    uploadCloudinary = multer({ storage: storage });
} else {
    // Fallback to local storage
    console.warn("⚠️ Cloudinary credentials missing. Falling back to local disk storage for uploads.");
    
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
    }
    
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'uploads/');
        },
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    });

    uploadCloudinary = multer({ storage: storage });
}

module.exports = { cloudinary, uploadCloudinary };
