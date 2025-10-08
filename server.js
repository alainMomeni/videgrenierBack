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
const newsletterRoutes = require('./routes/newsletterRoutes'); // NOUVEAU

// Import du middleware
const checkBlockedStatus = require('./middleware/checkBlockedStatus');

const app = express();
const PORT = process.env.PORT || 5000;

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads/products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads/products directory');
}

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (images uploadées)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes publiques (pas de vérification de blocage)
app.use('/api/auth', authRoutes);
app.use('/api/newsletters', newsletterRoutes); // NOUVEAU - partiellement public

// Routes protégées avec vérification de blocage
app.use('/api/products', checkBlockedStatus, productRoutes);
app.use('/api/stock', checkBlockedStatus, stockRoutes);
app.use('/api/supplies', checkBlockedStatus, supplyRoutes);
app.use('/api/sales', checkBlockedStatus, salesRoutes);
app.use('/api/reviews', checkBlockedStatus, reviewRoutes);
app.use('/api/users', checkBlockedStatus, userRoutes);
app.use('/api/upload', checkBlockedStatus, uploadRoutes);

// Route racine
app.get('/', (req, res) => {
  res.json({ 
    message: 'API VideGrenier is running...',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      stock: '/api/stock',
      supplies: '/api/supplies',
      sales: '/api/sales',
      reviews: '/api/reviews',
      users: '/api/users',
      upload: '/api/upload',
      newsletters: '/api/newsletters'
    }
  });
});

// Route 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
  console.log(`Frontend should be running at http://localhost:5173`);
  console.log(`Uploads directory: ${uploadsDir}`);
});

// Gérer les arrêts propres
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});