// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

// Middleware pour vérifier l'authentification
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. Please login to continue.',
        requiresAuth: true 
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ 
          message: 'Invalid or expired token. Please login again.',
          requiresAuth: true 
        });
      }

      // Vérifier si le compte est bloqué
      if (user.isBlocked) {
        return res.status(403).json({ 
          message: 'Your account has been blocked. Please contact support.',
          blocked: true 
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Middleware optionnel pour vérifier le rôle
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        requiresAuth: true 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

module.exports = { 
  authenticateToken, 
  requireRole 
};