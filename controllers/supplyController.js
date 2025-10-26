// backend/controllers/supplyController.js
const { query } = require('../db');
const { getCurrentMonthStock, updateCurrentMonthStock } = require('../helpers/stockHelper');

// GET tous les approvisionnements
exports.getAllSupplies = async (req, res) => {
  try {
    const { userId } = req.query;
    
    let queryStr = `
      SELECT 
        s.*,
        p.nom_produit,
        CONCAT(u.first_name, ' ', u.last_name) as nom_user
      FROM supplies s
      LEFT JOIN products p ON s.id_produit = p.id_produit
      LEFT JOIN users u ON s.id_user = u.id
    `;
    
    const params = [];
    
    if (userId) {
      queryStr += ' WHERE p.id_user = $1';
      params.push(userId);
    }
    
    queryStr += ' ORDER BY s.date_approvisionnement DESC';
    
    const result = await query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching supplies:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// CREATE un nouvel approvisionnement
exports.createSupply = async (req, res) => {
  try {
    const { 
      id_produit, 
      id_user, 
      quantite, 
      prix_unitaire, 
      date_approvisionnement, 
      notes 
    } = req.body;
    
    console.log('📦 ========================================');
    console.log('📦 CREATING NEW SUPPLY');
    console.log('📦 Product ID:', id_produit);
    console.log('📦 Quantity:', quantite);
    console.log('📦 Unit Price:', prix_unitaire, 'FCFA');
    console.log('📦 ========================================');
    
    // Vérifier que le produit existe
    const productCheck = await query(
      'SELECT id_produit, quantite, prix FROM products WHERE id_produit = $1', 
      [id_produit]
    );
    
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = productCheck.rows[0];
    const prix_total = quantite * prix_unitaire;
    
    // ✅ STATUT AUTOMATIQUEMENT "delivered"
    const statut = 'delivered';
    
    // 1. Créer l'approvisionnement
    const supplyResult = await query(
      `INSERT INTO supplies 
       (id_produit, id_user, quantite, prix_unitaire, prix_total, date_approvisionnement, statut, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [id_produit, id_user, quantite, prix_unitaire, prix_total, date_approvisionnement, statut, notes]
    );
    
    console.log('✅ Supply created with ID:', supplyResult.rows[0].id_supply);
    console.log('✅ Status: delivered (automatic)');
    
    // 2. Mettre à jour la quantité du produit
    const nouvelleQuantiteProduit = parseInt(product.quantite) + parseInt(quantite);
    
    await query(
      'UPDATE products SET quantite = $1 WHERE id_produit = $2',
      [nouvelleQuantiteProduit, id_produit]
    );
    
    console.log('✅ Product quantity updated:', product.quantite, '→', nouvelleQuantiteProduit);
    
    // 3. ⚡ OBTENIR OU CRÉER LE STOCK DU MOIS EN COURS
    const currentStock = await getCurrentMonthStock(id_produit);
    
    // 4. Mettre à jour le stock du mois en cours
    const newQuantiteApprovisionner = parseInt(currentStock.quantite_approvisionner || 0) + parseInt(quantite);
    const newStockActuel = parseInt(currentStock.stock_actuel) + parseInt(quantite);
    const newValeurStock = newStockActuel * parseFloat(product.prix);
    
    await updateCurrentMonthStock(currentStock.id_stock, {
      quantite_approvisionner: newQuantiteApprovisionner,
      stock_actuel: newStockActuel,
      valeur_stock: newValeurStock
    });
    
    console.log('✅ ========================================');
    console.log('✅ CURRENT MONTH STOCK UPDATED');
    console.log('✅ Quantity supplied:', currentStock.quantite_approvisionner, '→', newQuantiteApprovisionner);
    console.log('✅ Current stock:', currentStock.stock_actuel, '→', newStockActuel);
    console.log('✅ Stock value:', newValeurStock, 'FCFA');
    console.log('✅ ========================================');
    
    res.status(201).json({
      message: 'Supply created and delivered successfully',
      supply: supplyResult.rows[0]
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR CREATING SUPPLY');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error' });
  }
};

// UPDATE un approvisionnement
exports.updateSupply = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      id_produit, 
      id_user, 
      quantite, 
      prix_unitaire, 
      date_approvisionnement, 
      notes 
    } = req.body;
    
    console.log('📝 ========================================');
    console.log('📝 UPDATING SUPPLY');
    console.log('📝 Supply ID:', id);
    console.log('📝 ========================================');
    
    // Récupérer l'ancien approvisionnement
    const oldSupplyResult = await query(
      'SELECT * FROM supplies WHERE id_supply = $1',
      [id]
    );
    
    if (oldSupplyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supply not found' });
    }
    
    const oldSupply = oldSupplyResult.rows[0];
    const oldQuantite = parseInt(oldSupply.quantite);
    const newQuantite = parseInt(quantite);
    const quantiteDifference = newQuantite - oldQuantite;
    
    console.log('   Old quantity:', oldQuantite);
    console.log('   New quantity:', newQuantite);
    console.log('   Difference:', quantiteDifference);
    
    const productResult = await query(
      'SELECT quantite, prix FROM products WHERE id_produit = $1',
      [id_produit]
    );
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = productResult.rows[0];
    const prix_total = newQuantite * prix_unitaire;
    
    // ✅ STATUT TOUJOURS "delivered"
    const statut = 'delivered';
    
    // 1. Mettre à jour l'approvisionnement
    const supplyResult = await query(
      `UPDATE supplies 
       SET id_produit = $1, id_user = $2, quantite = $3, 
           prix_unitaire = $4, prix_total = $5, date_approvisionnement = $6, statut = $7, notes = $8
       WHERE id_supply = $9 
       RETURNING *`,
      [id_produit, id_user, newQuantite, prix_unitaire, prix_total, date_approvisionnement, statut, notes, id]
    );
    
    console.log('✅ Supply updated');
    console.log('✅ Status: delivered (maintained)');
    
    // 2. Ajuster la quantité du produit
    if (quantiteDifference !== 0) {
      const nouvelleQuantiteProduit = parseInt(product.quantite) + quantiteDifference;
      
      await query(
        'UPDATE products SET quantite = $1 WHERE id_produit = $2',
        [nouvelleQuantiteProduit, id_produit]
      );
      
      console.log('✅ Product quantity adjusted:', product.quantite, '→', nouvelleQuantiteProduit);
      
      // 3. ⚡ OBTENIR LE STOCK DU MOIS EN COURS
      const currentStock = await getCurrentMonthStock(id_produit);
      
      // 4. Ajuster le stock du mois en cours
      const newQuantiteApprovisionner = parseInt(currentStock.quantite_approvisionner || 0) + quantiteDifference;
      const newStockActuel = parseInt(currentStock.stock_actuel) + quantiteDifference;
      const newValeurStock = newStockActuel * parseFloat(product.prix);
      
      await updateCurrentMonthStock(currentStock.id_stock, {
        quantite_approvisionner: newQuantiteApprovisionner,
        stock_actuel: newStockActuel,
        valeur_stock: newValeurStock
      });
      
      console.log('✅ Current month stock adjusted');
      console.log('   Quantity supplied:', currentStock.quantite_approvisionner - quantiteDifference, '→', newQuantiteApprovisionner);
      console.log('   Current stock:', currentStock.stock_actuel - quantiteDifference, '→', newStockActuel);
    }
    
    console.log('✅ ========================================');
    console.log('✅ SUPPLY AND STOCK UPDATED');
    console.log('✅ ========================================');
    
    res.json({
      message: 'Supply and stock updated successfully',
      supply: supplyResult.rows[0]
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR UPDATING SUPPLY');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE un approvisionnement
exports.deleteSupply = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ ========================================');
    console.log('🗑️ DELETING SUPPLY');
    console.log('🗑️ Supply ID:', id);
    console.log('🗑️ ========================================');
    
    const supplyResult = await query(
      'SELECT * FROM supplies WHERE id_supply = $1',
      [id]
    );
    
    if (supplyResult.rows.length === 0) {
      return res.status(404).json({ message: 'Supply not found' });
    }
    
    const supply = supplyResult.rows[0];
    const quantite = parseInt(supply.quantite);
    const id_produit = supply.id_produit;
    
    const productResult = await query(
      'SELECT quantite, prix FROM products WHERE id_produit = $1',
      [id_produit]
    );
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = productResult.rows[0];
    
    // 1. Supprimer l'approvisionnement
    await query('DELETE FROM supplies WHERE id_supply = $1', [id]);
    console.log('✅ Supply deleted');
    
    // 2. Diminuer la quantité du produit
    const nouvelleQuantiteProduit = parseInt(product.quantite) - quantite;
    
    await query(
      'UPDATE products SET quantite = $1 WHERE id_produit = $2',
      [nouvelleQuantiteProduit, id_produit]
    );
    
    console.log('✅ Product quantity reduced:', product.quantite, '→', nouvelleQuantiteProduit);
    
    // 3. ⚡ OBTENIR LE STOCK DU MOIS EN COURS
    const currentStock = await getCurrentMonthStock(id_produit);
    
    // 4. Ajuster le stock du mois en cours
    const newQuantiteApprovisionner = Math.max(0, parseInt(currentStock.quantite_approvisionner || 0) - quantite);
    const newStockActuel = Math.max(0, parseInt(currentStock.stock_actuel) - quantite);
    const newValeurStock = newStockActuel * parseFloat(product.prix);
    
    await updateCurrentMonthStock(currentStock.id_stock, {
      quantite_approvisionner: newQuantiteApprovisionner,
      stock_actuel: newStockActuel,
      valeur_stock: newValeurStock
    });
    
    console.log('✅ ========================================');
    console.log('✅ SUPPLY DELETED AND STOCK ADJUSTED');
    console.log('✅ Quantity supplied:', currentStock.quantite_approvisionner, '→', newQuantiteApprovisionner);
    console.log('✅ Current stock:', currentStock.stock_actuel, '→', newStockActuel);
    console.log('✅ ========================================');
    
    res.json({ message: 'Supply deleted and stock adjusted successfully' });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR DELETING SUPPLY');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error' });
  }
};