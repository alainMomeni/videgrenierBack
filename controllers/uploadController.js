// backend/controllers/uploadController.js
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Configuration Multer pour stocker en mémoire
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Accepter seulement les images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Upload vers Cloudinary
const uploadToCloudinary = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('📤 Uploading image to Cloudinary...');

    // Uploader vers Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'vide_grenier_products', // Dossier dans Cloudinary
          transformation: [
            { width: 800, height: 800, crop: 'limit' }, // Redimensionner max 800x800
            { quality: 'auto' }, // Optimisation automatique
            { fetch_format: 'auto' }, // Format optimal (WebP si supporté)
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // Envoyer le buffer à Cloudinary
      uploadStream.end(req.file.buffer);
    });

    console.log('✅ Image uploaded successfully to Cloudinary');
    console.log('🔗 URL:', result.secure_url);

    res.json({
      message: 'Image uploaded successfully',
      imageUrl: result.secure_url, // URL complète de Cloudinary
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload image',
      error: error.message 
    });
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
};