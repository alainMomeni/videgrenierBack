// backend/controllers/supplyController.js
const { query } = require('../db');

// GET tous les approvisionnements
exports.getAllSupplies = async (req, res) => {
  try {
    const { userId } = req.query; // Pour filtrer par seller
    
    let queryStr = `
      SELECT 
        s.*,
        p.nom_produit,
        sup.nom_fournisseur,
        CONCAT(u.first_name, ' ', u.last_name) as nom_user
      FROM supplies s
      LEFT JOIN products p ON s.id_produit = p.id_produit
      LEFT JOIN suppliers sup ON s.id_fournisseur = sup.id_fournisseur
      LEFT JOIN users u ON s.id_user = u.id
    `;
    
    const params = [];
    
    // Si userId fourni, filtrer par produits du seller
    if (userId) {
      queryStr += ' WHERE p.id_user = $1';
      params.push(userId);
    }
    
    queryStr += ' ORDER BY s.date_approvisionnement DESC';
    
    const result = await query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// CREATE un nouvel approvisionnement
exports.createSupply = async (req, res) => {
  try {
    const { 
      id_produit, id_fournisseur, id_user, quantite, 
      prix_unitaire, date_approvisionnement, statut, notes 
    } = req.body;
    
    // Vérifier que le produit existe
    const productCheck = await query('SELECT * FROM products WHERE id_produit = $1', [id_produit]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const prix_total = quantite * prix_unitaire;
    
    const result = await query(
      `INSERT INTO supplies 
       (id_produit, id_fournisseur, id_user, quantite, prix_unitaire, prix_total, date_approvisionnement, statut, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [id_produit, id_fournisseur, id_user, quantite, prix_unitaire, prix_total, date_approvisionnement, statut, notes]
    );
    
    res.status(201).json({
      message: 'Supply created successfully',
      supply: result.rows[0]
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE un approvisionnement
exports.updateSupply = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      id_produit, id_fournisseur, id_user, quantite, 
      prix_unitaire, date_approvisionnement, statut, notes 
    } = req.body;
    
    const prix_total = quantite * prix_unitaire;
    
    const result = await query(
      `UPDATE supplies 
       SET id_produit = $1, id_fournisseur = $2, id_user = $3, quantite = $4, 
           prix_unitaire = $5, prix_total = $6, date_approvisionnement = $7, statut = $8, notes = $9
       WHERE id_supply = $10 
       RETURNING *`,
      [id_produit, id_fournisseur, id_user, quantite, prix_unitaire, prix_total, date_approvisionnement, statut, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supply not found' });
    }
    
    res.json({
      message: 'Supply updated successfully',
      supply: result.rows[0]
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE un approvisionnement
exports.deleteSupply = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM supplies WHERE id_supply = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Supply not found' });
    }
    
    res.json({ message: 'Supply deleted successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET tous les fournisseurs
exports.getAllSuppliers = async (req, res) => {
  try {
    const result = await query('SELECT * FROM suppliers ORDER BY nom_fournisseur');
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};