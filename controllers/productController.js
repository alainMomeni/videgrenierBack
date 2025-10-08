// backend/controllers/productController.js
const { pool } = require('../db'); // ← CORRECTION ICI

// GET tous les produits (avec filtre optionnel par user)
const getAllProducts = async (req, res) => {
  try {
    const { userId } = req.query;
    
    let query = `SELECT * FROM products`;
    
    const params = [];
    if (userId) {
      query += ' WHERE id_user = $1';
      params.push(userId);
    }
    
    query += ' ORDER BY date_creation DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET un produit par ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM products WHERE id_produit = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// CREATE un nouveau produit + créer automatiquement son stock
const createProduct = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id_user, nom_produit, categorie, prix, quantite, photo, description, nom_createur } = req.body;
    
    // 1. Créer le produit
    const productResult = await client.query(
      `INSERT INTO products (id_user, nom_produit, nom_createur, categorie, prix, quantite, photo, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id_user, nom_produit, nom_createur || 'Unknown', categorie, prix, quantite, photo, description]
    );
    
    const newProduct = productResult.rows[0];
    
    // 2. Créer automatiquement l'enregistrement de stock pour ce produit
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    await client.query(
      `INSERT INTO stock_records (
        date, 
        id_produit,
        quantite_ouverture_mois, 
        quantite_vendu_mois, 
        stock_actuel, 
        quantite_approvisionner, 
        valeur_stock,
        prix_unitaire
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`,
        newProduct.id_produit,
        quantite,
        0,
        quantite,
        0,
        quantite * prix,
        prix
      ]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({ 
      message: 'Product and stock created successfully', 
      product: newProduct 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

// UPDATE un produit existant
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom_produit, categorie, prix, quantite, photo, description } = req.body;
    
    const result = await pool.query(
      `UPDATE products 
       SET nom_produit = $1, categorie = $2, prix = $3, quantite = $4, photo = $5, description = $6
       WHERE id_produit = $7
       RETURNING *`,
      [nom_produit, categorie, prix, quantite, photo, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product updated successfully', product: result.rows[0] });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE un produit avec suppression en cascade
const deleteProduct = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    
    // Vérifier que le produit existe
    const productCheck = await client.query(
      'SELECT * FROM products WHERE id_produit = $1',
      [id]
    );
    
    if (productCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Supprimer dans l'ordre pour respecter les contraintes de clé étrangère
    await client.query('DELETE FROM reviews WHERE id_produit = $1', [id]);
    await client.query('DELETE FROM sales WHERE id_produit = $1', [id]);
    await client.query('DELETE FROM supplies WHERE id_produit = $1', [id]);
    await client.query('DELETE FROM stock_records WHERE id_produit = $1', [id]);
    await client.query('DELETE FROM cart_items WHERE id_produit = $1', [id]);
    await client.query('DELETE FROM products WHERE id_produit = $1', [id]);
    
    await client.query('COMMIT');
    
    res.json({ message: 'Product and all related records deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting product:', error);
    res.status(500).json({ 
      message: 'Failed to delete product', 
      error: error.message 
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};