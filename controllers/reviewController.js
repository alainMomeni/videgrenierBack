// backend/controllers/reviewController.js
const db = require('../db');

// GET tous les avis (avec filtres optionnels)
exports.getAllReviews = async (req, res) => {
  try {
    const { productId, status, sellerId } = req.query;
    
    let query = `
      SELECT 
        r.id_review,
        r.id_produit,
        r.customer_name,
        r.customer_email,
        r.rating,
        r.title,
        r.comment,
        r.review_date,
        r.status,
        r.helpful,
        r.verified,
        p.nom_produit,
        p.photo,
        p.id_user
      FROM reviews r
      LEFT JOIN products p ON r.id_produit = p.id_produit
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    // Filtre par seller (produits appartenant au vendeur)
    if (sellerId) {
      query += ` AND p.id_user = $${paramCount}`;
      params.push(sellerId);
      paramCount++;
    }
    
    if (productId) {
      query += ` AND r.id_produit = $${paramCount}`;
      params.push(productId);
      paramCount++;
    }
    
    if (status) {
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    query += ' ORDER BY r.review_date DESC';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET un avis par ID
exports.getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT 
        r.*,
        p.nom_produit,
        p.photo
      FROM reviews r
      LEFT JOIN products p ON r.id_produit = p.id_produit
      WHERE r.id_review = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET statistiques des avis pour un produit
exports.getProductReviewStats = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM reviews 
      WHERE id_produit = $1 AND status = 'approved'`,
      [productId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST créer un avis
exports.createReview = async (req, res) => {
  try {
    const { 
      id_produit, 
      customer_name, 
      customer_email, 
      rating, 
      title, 
      comment,
      verified = false 
    } = req.body;

    // Validation
    if (!id_produit || !customer_name || !customer_email || !rating) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Vérifier si le produit existe
    const productCheck = await db.query('SELECT id_produit FROM products WHERE id_produit = $1', [id_produit]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Vérifier si l'utilisateur a déjà laissé un avis pour ce produit
    const existingReview = await db.query(
      'SELECT id_review FROM reviews WHERE id_produit = $1 AND customer_email = $2',
      [id_produit, customer_email]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    // Créer l'avis (statut pending par défaut)
    const result = await db.query(
      `INSERT INTO reviews (
        id_produit, customer_name, customer_email, rating, title, comment, verified, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') 
      RETURNING *`,
      [id_produit, customer_name, customer_email, rating, title, comment, verified]
    );

    res.status(201).json({
      message: 'Review submitted successfully. It will be visible after approval.',
      review: result.rows[0]
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT mettre à jour le statut d'un avis
exports.updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['approved', 'pending', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const result = await db.query(
      'UPDATE reviews SET status = $1 WHERE id_review = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json({
      message: `Review ${status} successfully`,
      review: result.rows[0]
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT incrémenter le compteur "helpful"
exports.markAsHelpful = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'UPDATE reviews SET helpful = helpful + 1 WHERE id_review = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE supprimer un avis
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('DELETE FROM reviews WHERE id_review = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};