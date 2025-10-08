// backend/routes/salesRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAllSales, 
  getSaleById, 
  createSale,
  createBulkSales, // NOUVEAU
  updateSaleStatus,
  deleteSale
} = require('../controllers/salesController');

router.get('/', getAllSales);
router.get('/:id', getSaleById);
router.post('/', createSale);
router.post('/bulk', createBulkSales); // NOUVEAU - pour panier complet
router.put('/:id/status', updateSaleStatus);
router.delete('/:id', deleteSale);

module.exports = router;