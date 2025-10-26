// backend/routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const { submitContactForm } = require('../controllers/contactController');

// Route publique pour soumettre le formulaire de contact
router.post('/submit', submitContactForm);

module.exports = router;