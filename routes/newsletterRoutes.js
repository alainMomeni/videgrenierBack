// backend/routes/newsletterRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAllNewsletters, 
  getNewsletterStats,
  subscribe, 
  unsubscribe,
  reactivate
} = require('../controllers/newsletterController');

// Routes publiques
router.post('/subscribe', subscribe);

// Routes protégées (admin seulement)
router.get('/', getAllNewsletters);
router.get('/stats', getNewsletterStats);
router.delete('/:id', unsubscribe);
router.put('/:id/reactivate', reactivate);

module.exports = router;