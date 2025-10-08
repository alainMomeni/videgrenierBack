// backend/routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAllReviews, 
  getReviewById,
  getProductReviewStats,
  createReview,
  updateReviewStatus,
  markAsHelpful,
  deleteReview
} = require('../controllers/reviewController');

// Routes publiques
router.post('/', createReview);
router.get('/product/:productId/stats', getProductReviewStats);

// Routes protégées (admin)
router.get('/', getAllReviews);
router.get('/:id', getReviewById);
router.put('/:id/status', updateReviewStatus);
router.put('/:id/helpful', markAsHelpful);
router.delete('/:id', deleteReview);

module.exports = router;