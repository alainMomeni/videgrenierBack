// backend/controllers/userController.js
const { query } = require('../db');
const bcrypt = require('bcryptjs');

// ============================================
// GET ALL USERS
// ============================================
exports.getAllUsers = async (req, res) => {
  try {
    const result = await query(`
      SELECT id, first_name, last_name, email, role, created_at, is_blocked, email_verified
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// GET USER BY ID
// ============================================
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, first_name, last_name, email, role, created_at, is_blocked, email_verified FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching user:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// CREATE USER (Admin only)
// ============================================
exports.createUser = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role } = req.body;

    console.log('📝 ========================================');
    console.log('📝 CREATING NEW USER BY ADMIN');
    console.log('📝 Email:', email);
    console.log('📝 Role:', role);
    console.log('📝 ========================================');

    // Validation
    if (!first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hacher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Créer l'utilisateur (email_verified = true car créé par admin)
    const result = await query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, email_verified) 
       VALUES ($1, $2, $3, $4, $5, true) 
       RETURNING id, first_name, last_name, email, role, created_at, is_blocked, email_verified`,
      [first_name, last_name, email, passwordHash, role]
    );

    console.log('✅ ========================================');
    console.log('✅ USER CREATED SUCCESSFULLY');
    console.log('✅ User ID:', result.rows[0].id);
    console.log('✅ Email verified: true (admin created)');
    console.log('✅ ========================================');

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR CREATING USER');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// UPDATE USER
// ============================================
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, role, password } = req.body;

    console.log('📝 ========================================');
    console.log('📝 UPDATING USER');
    console.log('📝 User ID:', id);
    console.log('📝 New Email:', email);
    console.log('📝 New Role:', role);
    console.log('📝 Password update:', password ? 'Yes' : 'No');
    console.log('📝 ========================================');

    // Vérifier si l'utilisateur existe
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Si un nouveau mot de passe est fourni, le hacher
    let updateQuery;
    let updateParams;

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      updateQuery = `
        UPDATE users 
        SET first_name = $1, last_name = $2, email = $3, role = $4, password_hash = $5
        WHERE id = $6 
        RETURNING id, first_name, last_name, email, role, created_at, is_blocked, email_verified
      `;
      updateParams = [first_name, last_name, email, role, passwordHash, id];
      
      console.log('🔐 Password updated');
    } else {
      updateQuery = `
        UPDATE users 
        SET first_name = $1, last_name = $2, email = $3, role = $4
        WHERE id = $5 
        RETURNING id, first_name, last_name, email, role, created_at, is_blocked, email_verified
      `;
      updateParams = [first_name, last_name, email, role, id];
    }

    const result = await query(updateQuery, updateParams);

    console.log('✅ ========================================');
    console.log('✅ USER UPDATED SUCCESSFULLY');
    console.log('✅ ========================================');

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR UPDATING USER');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// DELETE USER
// ============================================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting user ID:', id);

    // Vérifier que l'utilisateur n'est pas un admin
    const userCheck = await query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userCheck.rows[0].role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete an admin account' });
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email', 
      [id]
    );

    console.log('✅ User deleted successfully');

    res.json({ 
      message: 'User deleted successfully', 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// UPDATE PASSWORD (User changing own password)
// ============================================
exports.updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 User changing own password, ID:', id);

    // Vérifier l'ancien mot de passe
    const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [id]);
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

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, id]);

    console.log('✅ Password updated successfully');

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('❌ Error updating password:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// TOGGLE BLOCK USER
// ============================================
exports.toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🚫 Toggling block status for user ID:', id);

    // Vérifier que l'utilisateur existe et récupérer son statut actuel
    const userCheck = await query('SELECT id, role, is_blocked FROM users WHERE id = $1', [id]);

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

    const result = await query(
      `UPDATE users 
       SET is_blocked = $1 
       WHERE id = $2 
       RETURNING id, first_name, last_name, email, role, created_at, is_blocked, email_verified`,
      [newBlockedStatus, id]
    );

    console.log(`✅ User ${newBlockedStatus ? 'blocked' : 'unblocked'} successfully`);

    res.json({
      message: `User ${newBlockedStatus ? 'blocked' : 'unblocked'} successfully`,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error toggling block status:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};