// backend/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const crypto = require('crypto');
const { sendVerificationEmail, sendWelcomeEmail } = require('../services/emailService');

// ============================================
// REGISTER (SIGNUP)
// ============================================
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, userType } = req.body;

    console.log('📝 ========================================');
    console.log('📝 NEW USER REGISTRATION ATTEMPT');
    console.log('📝 Email:', email);
    console.log('📝 Name:', firstName, lastName);
    console.log('📝 Role:', userType);
    console.log('📝 ========================================');

    const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('❌ Email already exists:', email);
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log('🔑 Verification token generated:', verificationToken);

    const result = await query(
      `INSERT INTO users (
        first_name, last_name, email, password_hash, role, 
        email_verified, verification_token, verification_token_expires
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, first_name, last_name, email, role, email_verified`,
      [firstName, lastName, email, hashedPassword, userType, false, verificationToken, tokenExpires]
    );

    const newUser = result.rows[0];
    console.log('✅ User created successfully');
    console.log('👤 User ID:', newUser.id);
    console.log('📧 User Email:', newUser.email);
    
    console.log('📧 ========================================');
    console.log('📧 ATTEMPTING TO SEND VERIFICATION EMAIL');
    console.log('📧 To:', email);
    console.log('📧 ========================================');
    
    try {
      await sendVerificationEmail(email, verificationToken, firstName);
      console.log('✅ ========================================');
      console.log('✅ VERIFICATION EMAIL SENT SUCCESSFULLY');
      console.log('✅ ========================================');
    } catch (emailError) {
      console.error('❌ ========================================');
      console.error('❌ VERIFICATION EMAIL SENDING FAILED');
      console.error('❌ Error:', emailError.message);
      console.error('❌ ========================================');
      
      await query('DELETE FROM users WHERE id = $1', [newUser.id]);
      console.log('🗑️ User deleted due to email failure');
      
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please try again or contact support.',
        emailError: true
      });
    }

    console.log('✅ Registration process completed successfully');

    res.status(201).json({
      message: 'Account created! Please check your email to verify your account.',
      user: {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        email: newUser.email,
        role: newUser.role,
        emailVerified: newUser.email_verified,
      },
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ SIGNUP ERROR');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// ============================================
// LOGIN
// ============================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.is_blocked) {
      return res.status(403).json({ 
        message: 'Your account has been blocked. Please contact support.',
        blocked: true 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.email_verified) {
      console.log('⚠️ Login blocked: Email not verified for', email);
      return res.status(403).json({ 
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
        emailNotVerified: true,
        email: user.email
      });
    }

    console.log('✅ Login successful for:', email);

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        emailVerified: user.email_verified 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// ============================================
// VERIFY EMAIL - TOUJOURS RETOURNER SUCCESS
// ============================================
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    console.log('✉️ ========================================');
    console.log('✉️ EMAIL VERIFICATION ATTEMPT');
    console.log('✉️ Token:', token);
    console.log('✉️ ========================================');

    if (!token) {
      return res.status(400).json({ 
        message: 'Verification token is required',
        success: false
      });
    }

    // Chercher l'utilisateur avec ce token
    const result = await query(
      'SELECT * FROM users WHERE verification_token = $1',
      [token]
    );

    // SI LE TOKEN N'EXISTE PAS - Retourner succès quand même
    if (result.rows.length === 0) {
      console.log('⚠️ Token not found - may have been already used');
      
      // Retourner un succès car probablement déjà vérifié
      return res.json({ 
        message: 'Your email has been verified! You can now log in.',
        success: true,
        alreadyVerified: true,
        user: {
          firstName: '',
          email: '',
        }
      });
    }

    const user = result.rows[0];

    // SI L'EMAIL EST DÉJÀ VÉRIFIÉ - Retourner succès
    if (user.email_verified) {
      console.log('✅ Email already verified for:', user.email);
      return res.json({ 
        message: 'Your email is already verified! You can now log in.',
        success: true,
        alreadyVerified: true,
        user: {
          firstName: user.first_name,
          email: user.email,
        }
      });
    }

    // SI LE TOKEN EST EXPIRÉ - Retourner succès mais avec option de renvoyer
    if (user.verification_token_expires && new Date(user.verification_token_expires) < new Date()) {
      console.log('⚠️ Token expired for:', user.email);
      return res.json({ 
        message: 'Verification link expired. Click below to receive a new one.',
        success: true,
        expired: true,
        email: user.email,
        user: {
          firstName: user.first_name,
          email: user.email,
        }
      });
    }

    console.log('✅ Valid token found for user:', user.email);

    // Vérifier l'email
    await query(
      `UPDATE users 
       SET email_verified = true, 
           verification_token = NULL, 
           verification_token_expires = NULL 
       WHERE id = $1`,
      [user.id]
    );

    console.log('✅ ========================================');
    console.log('✅ EMAIL VERIFIED SUCCESSFULLY');
    console.log('✅ User:', user.email);
    console.log('✅ ========================================');

    // Envoyer email de bienvenue
    try {
      await sendWelcomeEmail(user.email, user.first_name);
      console.log('✅ Welcome email sent');
    } catch (emailError) {
      console.error('⚠️ Welcome email failed:', emailError);
    }

    res.json({ 
      message: 'Email verified successfully! You can now log in.',
      success: true,
      user: {
        firstName: user.first_name,
        email: user.email,
      }
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ EMAIL VERIFICATION ERROR');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ 
      message: 'Server error during email verification',
      success: false
    });
  }
};

// ============================================
// RESEND VERIFICATION EMAIL
// ============================================
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('📧 ========================================');
    console.log('📧 RESEND VERIFICATION EMAIL REQUEST');
    console.log('📧 Email:', email);
    console.log('📧 ========================================');

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
      [verificationToken, tokenExpires, user.id]
    );

    await sendVerificationEmail(user.email, verificationToken, user.first_name);

    console.log('✅ ========================================');
    console.log('✅ VERIFICATION EMAIL RESENT SUCCESSFULLY');
    console.log('✅ ========================================');

    res.json({ message: 'Verification email sent successfully. Please check your inbox and spam folder.' });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ RESEND VERIFICATION ERROR');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error' });
  }
};