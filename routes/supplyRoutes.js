// backend/routes/supplyRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAllSupplies, 
  createSupply, 
  updateSupply, 
  deleteSupply
} = require('../controllers/supplyController');

// GET tous les approvisionnements
router.get('/', getAllSupplies);

// CREATE un nouvel approvisionnement
router.post('/', createSupply);

// UPDATE un approvisionnement
router.put('/:id', updateSupply);

// DELETE un approvisionnement
router.delete('/:id', deleteSupply);

module.exports = router;