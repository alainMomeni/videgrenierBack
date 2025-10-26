// backend/controllers/paymentController.js
const campayService = require('../services/campayService');

// ============================================
// INITIER UN PAIEMENT MOBILE MONEY
// ============================================
exports.initiateMobilePayment = async (req, res) => {
  try {
    const { order_id, phone_number, amount, operator } = req.body;

    console.log('📱 ========================================');
    console.log('📱 MOBILE PAYMENT INITIATION REQUEST');
    console.log('📱 Order ID:', order_id);
    console.log('📱 Phone:', phone_number);
    console.log('📱 Amount:', amount, 'XAF');
    console.log('📱 Operator:', operator);
    console.log('📱 ========================================');

    // Validation
    if (!order_id || !phone_number || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: order_id, phone_number, amount'
      });
    }

    // Vérifier le format du numéro (doit commencer par 237)
    if (!phone_number.startsWith('237')) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must start with 237 (Cameroon country code)'
      });
    }

    // Vérifier que le montant est suffisant
    if (amount < 150) {
      return res.status(400).json({
        success: false,
        message: 'Minimum payment amount is 150 FCFA'
      });
    }

    // Préparer les données du paiement
    const paymentData = {
      amount: parseInt(amount),
      phone_number: phone_number,
      external_reference: order_id,
      description: `Vide Grenier Kamer - Order ${order_id}`,
      external_user: phone_number
    };

    // Appeler CamPay
    const result = await campayService.initiatePayment(paymentData);

    if (result.success) {
      console.log('✅ Payment initiated successfully');
      res.json({
        success: true,
        message: 'Payment initiated successfully',
        reference: result.reference,
        status: result.status,
        ussd_code: result.ussd_code,
        operator: result.operator
      });
    } else {
      console.error('❌ Payment initiation failed:', result.error);
      res.status(400).json({
        success: false,
        message: result.error,
        details: result.details
      });
    }

  } catch (error) {
    console.error('❌ Error in initiateMobilePayment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ============================================
// VÉRIFIER LE STATUT D'UN PAIEMENT
// ============================================
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { reference } = req.params;

    console.log('🔍 ========================================');
    console.log('🔍 PAYMENT STATUS CHECK REQUEST');
    console.log('🔍 Reference:', reference);
    console.log('🔍 ========================================');

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    const result = await campayService.checkPaymentStatus(reference);

    if (result.success) {
      console.log('✅ Payment status retrieved:', result.status);
      res.json({
        success: true,
        status: result.status,
        reference: result.reference,
        amount: result.amount,
        operator: result.operator
      });
    } else {
      console.error('❌ Failed to check payment status:', result.error);
      res.status(400).json({
        success: false,
        message: result.error,
        details: result.details
      });
    }

  } catch (error) {
    console.error('❌ Error in checkPaymentStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ============================================
// WEBHOOK CAMPAY (Notifications de paiement)
// ============================================
exports.handleWebhook = async (req, res) => {
  try {
    console.log('🔔 ========================================');
    console.log('🔔 CAMPAY WEBHOOK RECEIVED');
    console.log('🔔 Body:', JSON.stringify(req.body, null, 2));
    console.log('🔔 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔔 ========================================');

    const signature = req.headers['x-campay-signature'];
    const payload = req.body;

    // Vérifier la signature
    if (signature && !campayService.verifyWebhookSignature(payload, signature)) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Traiter la notification
    const { reference, status, amount } = payload;

    console.log('✅ Webhook processed');
    console.log('✅ Reference:', reference);
    console.log('✅ Status:', status);
    console.log('✅ Amount:', amount);

    // TODO: Mettre à jour la vente dans la base de données si le paiement est réussi

    res.json({
      success: true,
      message: 'Webhook received'
    });

  } catch (error) {
    console.error('❌ Error in handleWebhook:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};