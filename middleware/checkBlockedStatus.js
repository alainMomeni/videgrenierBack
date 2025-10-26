// backend/middleware/checkBlockedStatus.js
const { query } = require('../db');

const checkBlockedStatus = async (req, res, next) => {
  try {
    // Récupérer l'ID utilisateur depuis le token JWT décodé
    const userId = req.user?.id;
    
    if (!userId) {
      return next();
    }
    
    // Vérifier le statut bloqué
    const result = await query(
      'SELECT is_blocked FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length > 0 && result.rows[0].is_blocked) {
      return res.status(403).json({ 
        message: 'Your account has been blocked. Please contact support.',
        blocked: true 
      });
    }
    
    next();
  } catch (error) {
    console.error('❌ Error checking blocked status:', error);
    next();
  }
};

module.exports = checkBlockedStatus;