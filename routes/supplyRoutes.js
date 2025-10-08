// backend/routes/supplyRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAllSupplies, 
  createSupply, 
  updateSupply, 
  deleteSupply,
  getAllSuppliers 
} = require('../controllers/supplyController');

router.get('/', getAllSupplies);
router.get('/suppliers', getAllSuppliers);
router.post('/', createSupply);
router.put('/:id', updateSupply);
router.delete('/:id', deleteSupply);

module.exports = router;