// backend/routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllStocks,
  createStock,
  updateStock,
  deleteStock
} = require('../controllers/stockController');

// Routes pour le stock
router.get('/', getAllStocks);
router.post('/', createStock);
router.put('/:id', updateStock);
router.delete('/:id', deleteStock);

module.exports = router;