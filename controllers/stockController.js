// backend/controllers/stockController.js
const { query } = require('../db');

// ============================================
// GET ALL STOCKS (avec filtres)
// ============================================
const getAllStocks = async (req, res) => {
  try {
    const { month, year, userId } = req.query;

    console.log('📊 ========================================');
    console.log('📊 GET ALL STOCKS REQUEST');
    console.log('📊 Month:', month);
    console.log('📊 Year:', year);
    console.log('📊 User ID:', userId);
    console.log('📊 ========================================');
    
    let sql = `
      SELECT 
        sr.id_stock,
        sr.date,
        sr.id_produit,
        sr.quantite_ouverture_mois,
        sr.quantite_vendu_mois,
        sr.stock_actuel,
        sr.quantite_approvisionner,
        sr.valeur_stock,
        sr.prix_unitaire,
        p.nom_produit,
        p.id_user
      FROM stock_records sr
      JOIN products p ON sr.id_produit = p.id_produit
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Filtre par mois et année
    if (month && year) {
      sql += ` AND EXTRACT(MONTH FROM sr.date) = $${paramIndex} AND EXTRACT(YEAR FROM sr.date) = $${paramIndex + 1}`;
      params.push(month, year);
      paramIndex += 2;
      console.log(`✅ Filtering by month: ${month}, year: ${year}`);
    }
    
    // Filtre par utilisateur (seller)
    if (userId) {
      sql += ` AND p.id_user = $${paramIndex}`;
      params.push(userId);
      console.log(`✅ Filtering by user ID: ${userId}`);
    }
    
    sql += ' ORDER BY sr.date DESC, p.nom_produit ASC';
    
    console.log('📝 SQL Query:', sql);
    console.log('📝 Params:', params);
    
    const result = await query(sql, params);
    
    console.log('✅ Stock records found:', result.rows.length);
    console.log('✅ ========================================');
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching stocks:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============================================
// CREATE STOCK
// ============================================
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

    console.log('📦 ========================================');
    console.log('📦 CREATING STOCK RECORD');
    console.log('📦 Product ID:', id_produit);
    console.log('📦 Date:', date);
    console.log('📦 Stock actuel:', stock_actuel);
    console.log('📦 ========================================');
    
    // Vérifier que le produit existe
    const productCheck = await query(
      'SELECT id_produit, nom_produit FROM products WHERE id_produit = $1',
      [id_produit]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const result = await query(
      `INSERT INTO stock_records (
        date, id_produit, quantite_ouverture_mois, 
        quantite_vendu_mois, stock_actuel, quantite_approvisionner, 
        valeur_stock, prix_unitaire
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        date, id_produit, quantite_ouverture_mois || 0,
        quantite_vendu_mois || 0, stock_actuel, quantite_approvisionner || 0,
        valeur_stock, prix_unitaire
      ]
    );

    console.log('✅ Stock record created with ID:', result.rows[0].id_stock);
    console.log('✅ ========================================');
    
    res.status(201).json({
      message: 'Stock record created successfully',
      stock: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating stock:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============================================
// UPDATE STOCK
// ============================================
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock_actuel, prix_unitaire } = req.body;

    console.log('📝 ========================================');
    console.log('📝 UPDATING STOCK RECORD');
    console.log('📝 Stock ID:', id);
    console.log('📝 New stock actuel:', stock_actuel);
    console.log('📝 ========================================');

    // Vérifier que le stock existe
    const stockCheck = await query(
      'SELECT id_stock, id_produit FROM stock_records WHERE id_stock = $1',
      [id]
    );

    if (stockCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Stock record not found' });
    }

    const result = await query(
      `UPDATE stock_records 
       SET stock_actuel = $1, prix_unitaire = $2
       WHERE id_stock = $3 RETURNING *`,
      [stock_actuel, prix_unitaire, id]
    );

    console.log('✅ Stock updated successfully');
    console.log('✅ ========================================');
    
    res.json({
      message: 'Stock updated successfully',
      stock: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating stock:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ============================================
// DELETE STOCK (AVEC PROTECTION)
// ============================================
const deleteStock = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ ========================================');
    console.log('🗑️ ATTEMPTING TO DELETE STOCK RECORD');
    console.log('🗑️ Stock ID:', id);
    console.log('🗑️ ========================================');

    // Vérifier que le stock existe
    const stockCheck = await query(
      'SELECT id_stock, id_produit FROM stock_records WHERE id_stock = $1',
      [id]
    );

    if (stockCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Stock record not found' });
    }

    const stock = stockCheck.rows[0];
    const productId = stock.id_produit;

    console.log('📦 Stock found, linked to product ID:', productId);

    // ✅ VÉRIFICATION : Le produit associé existe-t-il encore ?
    const productCheck = await query(
      'SELECT id_produit, nom_produit FROM products WHERE id_produit = $1',
      [productId]
    );

    if (productCheck.rows.length > 0) {
      const product = productCheck.rows[0];
      console.log('❌ Cannot delete - Product still exists:', product.nom_produit);
      
      return res.status(400).json({ 
        message: `Cannot delete this stock record. The product "${product.nom_produit}" is still active. Stock records can only be deleted when the associated product is deleted.`,
        reason: 'PRODUCT_EXISTS',
        productName: product.nom_produit,
        productId: productId
      });
    }

    // ✅ Si le produit n'existe plus, on peut supprimer le stock
    console.log('✅ Product does not exist - Stock can be deleted');

    await query('DELETE FROM stock_records WHERE id_stock = $1', [id]);
    
    console.log('✅ ========================================');
    console.log('✅ STOCK RECORD DELETED SUCCESSFULLY');
    console.log('✅ ========================================');

    res.json({ 
      message: 'Stock record deleted successfully'
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR DELETING STOCK RECORD');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllStocks,
  createStock,
  updateStock,
  deleteStock
};