// backend/controllers/authController.js
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { firstName, lastName, email, password, userType } = req.body;
  
  try {
    // Vérifier si l'utilisateur existe déjà
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }
    
    // Hacher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Insérer le nouvel utilisateur (is_blocked est FALSE par défaut)
    const newUser = await db.query(
      'INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, first_name, last_name, email, role, is_blocked',
      [firstName, lastName, email, passwordHash, userType]
    );
    
    // Créer et signer le JWT
    const token = jwt.sign(
      { id: newUser.rows[0].id, role: newUser.rows[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.status(201).json({ 
      token, 
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
        firstName: newUser.rows[0].first_name,
        lastName: newUser.rows[0].last_name,
        role: newUser.rows[0].role
      }
    });
    
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Trouver l'utilisateur
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const user = userResult.rows[0];
    
    // NOUVEAU : Vérifier si le compte est bloqué
    if (user.is_blocked) {
      return res.status(403).json({ 
        message: 'Your account has been blocked. Please contact support for assistance.',
        blocked: true 
      });
    }
    
    // Comparer les mots de passe
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Créer et signer le JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Renvoyer le token et les infos utilisateur (sans le mot de passe)
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    };
    
    res.json({ token, user: userResponse });
    
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Server error');
  }
};