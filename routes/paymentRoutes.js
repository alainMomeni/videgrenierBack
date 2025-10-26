// backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// ✅ Initier un paiement Mobile Money
router.post('/mobile/initiate', paymentController.initiateMobilePayment);

// ✅ Vérifier le statut d'un paiement
router.get('/mobile/status/:reference', paymentController.checkPaymentStatus);

// ✅ Webhook CamPay (pour recevoir les notifications)
router.post('/webhook/campay', paymentController.handleWebhook);

module.exports = router;