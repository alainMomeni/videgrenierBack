// backend/routes/salesRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getAllSales, 
  getSaleById, 
  createSale,
  createBulkSales,
  updateSaleStatus,
  deleteSale
} = require('../controllers/salesController');

// ✅ IMPORTER LES MIDDLEWARES
const { authenticateToken, requireRole } = require('../middleware/auth');
const checkBlockedStatus = require('../middleware/checkBlockedStatus');

// ============================================
// ROUTES SALES
// ============================================

// POST - Créer une vente (utilisateur authentifié)
router.post('/', authenticateToken, checkBlockedStatus, createSale); 

// POST - Créer plusieurs ventes (bulk checkout)
router.post('/bulk', authenticateToken, checkBlockedStatus, createBulkSales);

// GET - Consulter toutes les ventes (avec filtre optionnel)
router.get('/', authenticateToken, getAllSales);

// GET - Consulter une vente par ID
router.get('/:id', authenticateToken, getSaleById);

// PUT - Mettre à jour le statut d'une vente (admin/seller uniquement)
router.put('/:id/status', authenticateToken, requireRole('admin', 'seller'), updateSaleStatus);

// ✅ DELETE - Supprimer une vente (admin ou seller propriétaire)
// La vérification du propriétaire se fait dans le controller
router.delete('/:id', authenticateToken, requireRole('admin', 'seller'), deleteSale);

module.exports = router;