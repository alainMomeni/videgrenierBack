// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Configuration pour production (Render) ou développement (local)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

// Test de connexion
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Fonction query helper
const query = (text, params) => pool.query(text, params);

// Exporter à la fois le pool et la fonction query
module.exports = {
  query,
  pool
};