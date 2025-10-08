// backend/controllers/userController.js
const db = require('../db');
const bcrypt = require('bcryptjs');

// GET tous les utilisateurs
exports.getAllUsers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, first_name, last_name, email, role, created_at, is_blocked 
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET un utilisateur par ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT id, first_name, last_name, email, role, created_at, is_blocked FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE un utilisateur
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, role } = req.body;
    
    const result = await db.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, email = $3, role = $4
       WHERE id = $5 
       RETURNING id, first_name, last_name, email, role, created_at, is_blocked`,
      [first_name, last_name, email, role, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE un utilisateur
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully', user: result.rows[0] });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE le mot de passe d'un utilisateur
exports.updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    // Vérifier l'ancien mot de passe
    const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const isMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hacher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, id]);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// NOUVEAU : Bloquer/Débloquer un utilisateur
exports.toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que l'utilisateur existe et récupérer son statut actuel
    const userCheck = await db.query('SELECT id, role, is_blocked FROM users WHERE id = $1', [id]);
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userCheck.rows[0];
    
    // Empêcher le blocage d'un admin
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot block an admin account' });
    }
    
    // Inverser le statut is_blocked
    const newBlockedStatus = !user.is_blocked;
    
    const result = await db.query(
      `UPDATE users 
       SET is_blocked = $1 
       WHERE id = $2 
       RETURNING id, first_name, last_name, email, role, created_at, is_blocked`,
      [newBlockedStatus, id]
    );
    
    res.json({ 
      message: `User ${newBlockedStatus ? 'blocked' : 'unblocked'} successfully`, 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};