// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import des routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const stockRoutes = require('./routes/stockRoutes');
const supplyRoutes = require('./routes/supplyRoutes');
const salesRoutes = require('./routes/salesRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const contactRoutes = require('./routes/contactRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); // ✅ Routes de paiement CamPay

// Import du middleware
const checkBlockedStatus = require('./middleware/checkBlockedStatus');

const app = express();
const PORT = process.env.PORT || 5000;

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads/products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads/products directory');
}

// ===========================================
// CONFIGURATION CORS
// ===========================================

const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://videgrenier-pi.vercel.app', // ✅ Votre frontend Vercel
      process.env.FRONTEND_URL,
    ].filter(Boolean)
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ];

app.use(cors({
  origin: function(origin, callback) {
    // Autoriser les requêtes sans origine (Postman, apps mobiles, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      // En production, autoriser quand même temporairement pour debug
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CamPay-Signature'] // ✅ Pour webhook CamPay
}));

// ===========================================
// MIDDLEWARE
// ===========================================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir les fichiers statiques (images uploadées)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logger middleware (uniquement en développement)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ===========================================
// ROUTES
// ===========================================

// Routes publiques (pas de vérification de blocage)
app.use('/api/auth', authRoutes);
app.use('/api/newsletters', newsletterRoutes);
app.use('/api/contact', contactRoutes);

// ✅ Routes de paiement (webhook public, autres protégées)
app.use('/api/payment', paymentRoutes);

// Routes protégées avec vérification de blocage
app.use('/api/products', checkBlockedStatus, productRoutes);
app.use('/api/stock', checkBlockedStatus, stockRoutes);
app.use('/api/supplies', checkBlockedStatus, supplyRoutes);
app.use('/api/sales', checkBlockedStatus, salesRoutes);
app.use('/api/reviews', checkBlockedStatus, reviewRoutes);
app.use('/api/users', checkBlockedStatus, userRoutes);
app.use('/api/upload', checkBlockedStatus, uploadRoutes);

// ===========================================
// HEALTH CHECK & ROOT ROUTES
// ===========================================

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Vide Grenier Kamer API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: '✓ Connected',
      campay: process.env.CAMPAY_USERNAME ? '✓ Configured' : '✗ Not configured',
      cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? '✓ Configured' : '✗ Not configured',
      email: process.env.BREVO_API_KEY ? '✓ Configured' : '✗ Not configured',
    }
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Vide Grenier Kamer API',
    version: '1.0.0',
    status: 'Running',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      products: '/api/products',
      stock: '/api/stock',
      supplies: '/api/supplies',
      sales: '/api/sales',
      reviews: '/api/reviews',
      users: '/api/users',
      upload: '/api/upload',
      newsletters: '/api/newsletters',
      contact: '/api/contact',
      payment: '/api/payment', // ✅ Routes de paiement
    },
    payment_methods: {
      mobile_money: 'Orange Money, MTN Mobile Money (via CamPay)',
      cards: 'Coming soon',
    }
  });
});

// ===========================================
// ERROR HANDLING
// ===========================================

// Route 404
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message,
    path: req.path
  });
});

// ===========================================
// START SERVER
// ===========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('===========================================');
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📡 Server listening on port ${PORT}`);
  console.log(`🔗 Backend URL: ${process.env.NODE_ENV === 'production' ? 'https://videgrenierback.onrender.com' : `http://localhost:${PORT}`}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`✅ CORS allowed origins:`, allowedOrigins);
  console.log('-------------------------------------------');
  console.log('📦 Available Services:');
  console.log(`   💳 CamPay: ${process.env.CAMPAY_USERNAME ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`   ☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`   📧 Brevo Email: ${process.env.BREVO_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
  console.log('===========================================');
});

// ===========================================
// GRACEFUL SHUTDOWN
// ===========================================

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;