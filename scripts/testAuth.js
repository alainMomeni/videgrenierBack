// backend/scripts/testAuth.js
const axios = require('axios');

// Changer selon l'environnement
const API_URL = process.env.API_URL || 'https://videgrenierback.onrender.com/api';

const testAuth = async () => {
  try {
    console.log('🧪 Testing authentication endpoints...');
    console.log(`🔗 API URL: ${API_URL}\n`);
    
    // Générer un email unique pour le test
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'Test1234!';
    
    // ========================================
    // TEST 1: INSCRIPTION
    // ========================================
    console.log('=' .repeat(60));
    console.log('📝 TEST 1: REGISTRATION');
    console.log('=' .repeat(60));
    
    try {
      const registerData = {
        firstName: 'Test',
        lastName: 'User',
        email: testEmail,
        password: testPassword,
        userType: 'customer'
      };
      
      console.log('Sending registration request...');
      console.log('Data:', JSON.stringify(registerData, null, 2));
      
      const registerResponse = await axios.post(`${API_URL}/auth/register`, registerData);
      
      console.log('\n✅ REGISTRATION SUCCESSFUL!');
      console.log('Status:', registerResponse.status);
      console.log('Response:', JSON.stringify(registerResponse.data, null, 2));
      
      if (registerResponse.data.user) {
        console.log('\n📧 User created:');
        console.log(`   ID: ${registerResponse.data.user.id}`);
        console.log(`   Email: ${registerResponse.data.user.email}`);
        console.log(`   Email Verified: ${registerResponse.data.user.emailVerified}`);
      }
    } catch (error) {
      console.error('\n❌ REGISTRATION FAILED!');
      console.error('Status:', error.response?.status);
      console.error('Error:', JSON.stringify(error.response?.data, null, 2));
      console.error('Full error:', error.message);
    }
    
    console.log('\n');
    
    // ========================================
    // TEST 2: CONNEXION (avec compte vérifié)
    // ========================================
    console.log('=' .repeat(60));
    console.log('🔐 TEST 2: LOGIN (will fail if email not verified)');
    console.log('=' .repeat(60));
    
    try {
      const loginData = {
        email: testEmail,
        password: testPassword
      };
      
      console.log('Sending login request...');
      console.log('Data:', JSON.stringify(loginData, null, 2));
      
      const loginResponse = await axios.post(`${API_URL}/auth/login`, loginData);
      
      console.log('\n✅ LOGIN SUCCESSFUL!');
      console.log('Status:', loginResponse.status);
      console.log('Token received:', loginResponse.data.token ? 'Yes' : 'No');
      if (loginResponse.data.token) {
        console.log('Token preview:', loginResponse.data.token.substring(0, 30) + '...');
      }
      console.log('User:', JSON.stringify(loginResponse.data.user, null, 2));
    } catch (error) {
      console.error('\n❌ LOGIN FAILED!');
      console.error('Status:', error.response?.status);
      console.error('Error:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.data?.emailNotVerified) {
        console.log('\n💡 This is expected - email needs to be verified first');
      }
    }
    
    console.log('\n');
    
    // ========================================
    // TEST 3: VÉRIFIER LA CONNEXION DB
    // ========================================
    console.log('=' .repeat(60));
    console.log('🔍 TEST 3: DATABASE CONNECTION CHECK');
    console.log('=' .repeat(60));
    
    try {
      const healthResponse = await axios.get(`${API_URL.replace('/api', '')}/health`);
      console.log('\n✅ BACKEND HEALTH CHECK PASSED!');
      console.log('Status:', healthResponse.status);
      console.log('Response:', JSON.stringify(healthResponse.data, null, 2));
    } catch (error) {
      console.error('\n❌ HEALTH CHECK FAILED!');
      console.error('Error:', error.message);
    }
    
    console.log('\n');
    console.log('=' .repeat(60));
    console.log('🎯 TEST COMPLETED');
    console.log('=' .repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ UNEXPECTED ERROR:', error.message);
    process.exit(1);
  }
};

// Exécuter les tests
testAuth();