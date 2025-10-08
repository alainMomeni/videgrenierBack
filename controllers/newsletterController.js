// backend/controllers/newsletterController.js
const db = require('../db');

// GET tous les emails de la newsletter
exports.getAllNewsletters = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id_newsletter, email, subscribed_at, is_active
      FROM newsletters 
      ORDER BY subscribed_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET statistiques de la newsletter
exports.getNewsletterStats = async (req, res) => {
  try {
    const totalResult = await db.query('SELECT COUNT(*) FROM newsletters WHERE is_active = true');
    const recentResult = await db.query(`
      SELECT COUNT(*) FROM newsletters 
      WHERE subscribed_at >= NOW() - INTERVAL '30 days' AND is_active = true
    `);
    
    res.json({
      total: parseInt(totalResult.rows[0].count),
      lastMonth: parseInt(recentResult.rows[0].count)
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST inscription à la newsletter
exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validation email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    
    // Vérifier si l'email existe déjà
    const existingEmail = await db.query('SELECT * FROM newsletters WHERE email = $1', [email]);
    
    if (existingEmail.rows.length > 0) {
      // Si l'email existe mais est inactif, le réactiver
      if (!existingEmail.rows[0].is_active) {
        await db.query(
          'UPDATE newsletters SET is_active = true, subscribed_at = NOW() WHERE email = $1',
          [email]
        );
        return res.status(200).json({ message: 'Welcome back! Your subscription has been reactivated.' });
      }
      
      return res.status(400).json({ message: 'This email is already subscribed to our newsletter.' });
    }
    
    // Insérer le nouvel email
    const result = await db.query(
      'INSERT INTO newsletters (email) VALUES ($1) RETURNING *',
      [email]
    );
    
    res.status(201).json({ 
      message: 'Successfully subscribed to newsletter!',
      subscriber: result.rows[0]
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE désabonnement ou suppression
exports.unsubscribe = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query; // Si permanent=true, suppression définitive
    
    if (permanent === 'true') {
      const result = await db.query(
        'DELETE FROM newsletters WHERE id_newsletter = $1 RETURNING email',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Subscriber not found' });
      }
      
      res.json({ message: 'Subscriber permanently deleted' });
    } else {
      const result = await db.query(
        'UPDATE newsletters SET is_active = false WHERE id_newsletter = $1 RETURNING email',
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Subscriber not found' });
      }
      
      res.json({ message: 'Subscriber unsubscribed successfully' });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT réactiver un abonnement
exports.reactivate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'UPDATE newsletters SET is_active = true WHERE id_newsletter = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    res.json({ 
      message: 'Subscriber reactivated successfully',
      subscriber: result.rows[0]
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};