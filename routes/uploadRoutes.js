// backend/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

// Route pour uploader une image de produit
router.post('/product-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Retourner l'URL relative de l'image
    const imageUrl = `/uploads/products/${req.file.filename}`;
    
    res.json({ 
      message: 'Image uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

module.exports = router;