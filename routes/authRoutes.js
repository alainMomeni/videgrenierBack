// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Routes principales
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);

// Route de test pour vérifier l'envoi d'email
router.get('/test-email', async (req, res) => {
  try {
    const { sendVerificationEmail } = require('../services/emailService');
    
    console.log('🧪 Testing email sending...');
    
    await sendVerificationEmail(
      'videgrenierkamer2025@gmail.com', // Email de destination
      'test-token-123456', // Token de test
      'Test User' // Nom de l'utilisateur
    );
    
    res.json({ 
      success: true,
      message: 'Test email sent successfully! Check console logs and your inbox.',
      recipient: 'videgrenierkamer2025@gmail.com'
    });
  } catch (error) {
    console.error('❌ Test email failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

module.exports = router;