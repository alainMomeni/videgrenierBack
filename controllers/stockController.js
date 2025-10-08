// backend/controllers/stockController.js
const { pool } = require('../db'); // ← CORRECTION ICI

// GET tous les stocks avec filtres
const getAllStocks = async (req, res) => {
  try {
    const { month, year, userId } = req.query;
    
    let query = `
      SELECT sr.*, p.nom_produit, p.id_user
      FROM stock_records sr
      JOIN products p ON sr.id_produit = p.id_produit
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM sr.date) = $${paramIndex} AND EXTRACT(YEAR FROM sr.date) = $${paramIndex + 1}`;
      params.push(month, year);
      paramIndex += 2;
    }
    
    if (userId) {
      query += ` AND p.id_user = $${paramIndex}`;
      params.push(userId);
    }
    
    query += ' ORDER BY sr.date DESC, p.nom_produit ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stocks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// CREATE un nouvel enregistrement de stock
const createStock = async (req, res) => {
  try {
    const {
      date,
      id_produit,
      quantite_ouverture_mois,
      quantite_vendu_mois,
      stock_actuel,
      quantite_approvisionner,
      valeur_stock,
      prix_unitaire
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO stock_records (
        date, id_produit, quantite_ouverture_mois, 
        quantite_vendu_mois, stock_actuel, quantite_approvisionner, 
        valeur_stock, prix_unitaire
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        date, id_produit, quantite_ouverture_mois,
        quantite_vendu_mois, stock_actuel, quantite_approvisionner,
        valeur_stock, prix_unitaire
      ]
    );
    
    res.status(201).json({
      message: 'Stock record created successfully',
      stock: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating stock:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// UPDATE un enregistrement de stock
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_actuel, prix_unitaire } = req.body;
    
    const result = await pool.query(
      `UPDATE stock_records 
       SET stock_actuel = $1, prix_unitaire = $2
       WHERE id_stock = $3 RETURNING *`,
      [stock_actuel, prix_unitaire, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Stock record not found' });
    }
    
    res.json({
      message: 'Stock updated successfully',
      stock: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE un enregistrement de stock
const deleteStock = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM stock_records WHERE id_stock = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Stock record not found' });
    }
    
    res.json({ message: 'Stock record deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllStocks,
  createStock,
  updateStock,
  deleteStock
};