// backend/services/campayService.js
const axios = require('axios');

const CAMPAY_BASE_URL = process.env.CAMPAY_BASE_URL || 'https://demo.campay.net/api';
const CAMPAY_USERNAME = process.env.CAMPAY_USERNAME;
const CAMPAY_PASSWORD = process.env.CAMPAY_PASSWORD;

class CamPayService {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    
    console.log('🔧 ========================================');
    console.log('🔧 CAMPAY SERVICE INITIALIZED');
    console.log('🔧 Base URL:', CAMPAY_BASE_URL);
    console.log('🔧 Username:', CAMPAY_USERNAME ? 'SET ✅' : 'MISSING ❌');
    console.log('🔧 Password:', CAMPAY_PASSWORD ? 'SET ✅' : 'MISSING ❌');
    console.log('🔧 ========================================');
  }

  // ============================================
  // OBTENIR LE TOKEN D'AUTHENTIFICATION
  // ============================================
  async getToken() {
    try {
      // Vérifier si le token existe et est valide
      if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        console.log('✅ Using cached token');
        return this.token;
      }

      console.log('🔐 Getting CamPay authentication token...');
      console.log('📡 POST', `${CAMPAY_BASE_URL}/token/`);

      const response = await axios.post(
        `${CAMPAY_BASE_URL}/token/`,
        {
          username: CAMPAY_USERNAME,
          password: CAMPAY_PASSWORD
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 secondes
        }
      );

      this.token = response.data.token;
      // Token valide pendant 1 heure (3600 secondes)
      this.tokenExpiry = Date.now() + (3600 * 1000);

      console.log('✅ CamPay token obtained successfully');
      console.log('✅ Token:', this.token.substring(0, 20) + '...');
      return this.token;

    } catch (error) {
      console.error('❌ ========================================');
      console.error('❌ ERROR GETTING CAMPAY TOKEN');
      console.error('❌ URL:', `${CAMPAY_BASE_URL}/token/`);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Status Text:', error.response?.statusText);
      console.error('❌ Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('❌ Error Message:', error.message);
      console.error('❌ ========================================');
      throw new Error('Failed to authenticate with CamPay: ' + (error.response?.data?.message || error.message));
    }
  }

  // ============================================
  // INITIER UN PAIEMENT MOBILE MONEY
  // ============================================
  async initiatePayment(paymentData) {
    try {
      console.log('💳 ========================================');
      console.log('💳 INITIATING CAMPAY PAYMENT');
      console.log('💳 Amount:', paymentData.amount, 'XAF');
      console.log('💳 Phone:', paymentData.phone_number);
      console.log('💳 Reference:', paymentData.external_reference);
      console.log('💳 ========================================');

      const token = await this.getToken();

      console.log('📡 POST', `${CAMPAY_BASE_URL}/collect/`);

      const response = await axios.post(
        `${CAMPAY_BASE_URL}/collect/`,
        {
          amount: paymentData.amount.toString(),
          currency: 'XAF',
          from: paymentData.phone_number,
          description: paymentData.description || 'Vide Grenier Kamer - Purchase',
          external_reference: paymentData.external_reference,
          external_user: paymentData.external_user || '',
        },
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 secondes
        }
      );

      console.log('✅ ========================================');
      console.log('✅ CAMPAY PAYMENT INITIATED');
      console.log('✅ Reference:', response.data.reference);
      console.log('✅ Status:', response.data.status);
      console.log('✅ USSD Code:', response.data.ussd_code);
      console.log('✅ Operator:', response.data.operator);
      console.log('✅ Full Response:', JSON.stringify(response.data, null, 2));
      console.log('✅ ========================================');
      
      return {
        success: true,
        reference: response.data.reference,
        status: response.data.status,
        ussd_code: response.data.ussd_code,
        operator: response.data.operator,
        data: response.data
      };

    } catch (error) {
      console.error('❌ ========================================');
      console.error('❌ ERROR INITIATING CAMPAY PAYMENT');
      console.error('❌ URL:', `${CAMPAY_BASE_URL}/collect/`);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Status Text:', error.response?.statusText);
      console.error('❌ Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('❌ Error Message:', error.message);
      console.error('❌ ========================================');
      
      return {
        success: false,
        error: error.response?.data?.message || 'Payment initiation failed',
        details: error.response?.data
      };
    }
  }

  // ============================================
  // VÉRIFIER LE STATUT D'UN PAIEMENT
  // ============================================
  async checkPaymentStatus(reference) {
    try {
      console.log('🔍 ========================================');
      console.log('🔍 CHECKING PAYMENT STATUS');
      console.log('🔍 Reference:', reference);
      console.log('🔍 ========================================');

      const token = await this.getToken();

      console.log('📡 GET', `${CAMPAY_BASE_URL}/transaction/${reference}/`);

      const response = await axios.get(
        `${CAMPAY_BASE_URL}/transaction/${reference}/`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('📊 ========================================');
      console.log('📊 PAYMENT STATUS RETRIEVED');
      console.log('📊 Status:', response.data.status);
      console.log('📊 Amount:', response.data.amount);
      console.log('📊 Operator:', response.data.operator);
      console.log('📊 Full Response:', JSON.stringify(response.data, null, 2));
      console.log('📊 ========================================');

      return {
        success: true,
        status: response.data.status,
        reference: response.data.reference,
        amount: response.data.amount,
        operator: response.data.operator,
        data: response.data
      };

    } catch (error) {
      console.error('❌ ========================================');
      console.error('❌ ERROR CHECKING PAYMENT STATUS');
      console.error('❌ Reference:', reference);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('❌ ========================================');
      
      return {
        success: false,
        error: 'Failed to check payment status',
        details: error.response?.data
      };
    }
  }

  // ============================================
  // VÉRIFIER LA SIGNATURE DU WEBHOOK
  // ============================================
  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const webhookSecret = process.env.CAMPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ CAMPAY_WEBHOOK_SECRET not configured');
      return false;
    }

    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const isValid = computedSignature === signature;
    console.log('🔐 Webhook signature verification:', isValid ? 'VALID ✅' : 'INVALID ❌');
    
    return isValid;
  }
}

module.exports = new CamPayService();