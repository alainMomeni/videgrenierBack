// backend/controllers/salesController.js
const { query, pool } = require('../db');

// ============================================
// GET TOUTES LES VENTES
// ============================================
exports.getAllSales = async (req, res) => {
  try {
    const { sellerId } = req.query;

    console.log('📊 ========================================');
    console.log('📊 GET ALL SALES REQUEST');
    console.log('📊 Seller ID filter:', sellerId);
    console.log('📊 ========================================');
    
    let queryStr = `
      SELECT 
        s.id_sale, 
        s.order_id, 
        s.id_produit, 
        s.id_seller,
        s.id_buyer,
        s.buyer_name, 
        s.buyer_email, 
        s.quantity, 
        s.unit_price, 
        s.total_amount, 
        s.sale_date, 
        s.status, 
        s.payment_method,
        s.payment_reference,
        p.nom_produit,
        p.photo,
        CONCAT(seller.first_name, ' ', seller.last_name) as seller_name,
        CONCAT(buyer.first_name, ' ', buyer.last_name) as buyer_full_name
      FROM sales s
      LEFT JOIN products p ON s.id_produit = p.id_produit
      LEFT JOIN users seller ON s.id_seller = seller.id
      LEFT JOIN users buyer ON s.id_buyer = buyer.id
    `;
    
    const params = [];
    if (sellerId) {
      queryStr += ' WHERE s.id_seller = $1';
      params.push(sellerId);
      console.log('✅ Filtering by seller ID:', sellerId);
    }
    
    queryStr += ' ORDER BY s.sale_date DESC';
    
    const result = await query(queryStr, params);
    
    console.log('✅ Sales found:', result.rows.length);
    console.log('✅ ========================================');
    
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching sales:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// GET UNE VENTE PAR ID
// ============================================
exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        s.*,
        p.nom_produit,
        p.photo,
        CONCAT(seller.first_name, ' ', seller.last_name) as seller_name,
        CONCAT(buyer.first_name, ' ', buyer.last_name) as buyer_full_name
      FROM sales s
      LEFT JOIN products p ON s.id_produit = p.id_produit
      LEFT JOIN users seller ON s.id_seller = seller.id
      LEFT JOIN users buyer ON s.id_buyer = buyer.id
      WHERE s.id_sale = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching sale:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// CREATE SALE
// ============================================
exports.createSale = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      id_produit, 
      quantity, 
      payment_method,
      shipping_address,
      payment_reference,
      order_id: providedOrderId
    } = req.body;

    const userId = req.user.id;
    const buyer_name = `${req.user.first_name} ${req.user.last_name}`;
    const buyer_email = req.user.email;

    console.log('🛒 ========================================');
    console.log('🛒 CREATING NEW SALE');
    console.log('🛒 Product ID:', id_produit);
    console.log('🛒 Quantity:', quantity);
    console.log('🛒 Buyer:', buyer_name, `(ID: ${userId})`);
    console.log('🛒 Payment Reference:', payment_reference || 'None');
    console.log('🛒 ========================================');

    if (!id_produit || !quantity || !payment_method) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await client.query('BEGIN');

    const productResult = await client.query(
      'SELECT id_produit, nom_produit, prix, quantite, id_user FROM products WHERE id_produit = $1',
      [id_produit]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = productResult.rows[0];

    if (product.quantite < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: `Insufficient stock. Only ${product.quantite} items available.`,
        available: product.quantite
      });
    }

    const unit_price = parseFloat(product.prix);
    const total_amount = unit_price * quantity;
    const order_id = providedOrderId || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // ✅ Créer la vente avec payment_reference et order_id
    const saleResult = await client.query(
      `INSERT INTO sales (
        order_id, 
        id_produit, 
        id_seller,
        id_buyer,
        buyer_name, 
        buyer_email, 
        quantity, 
        unit_price, 
        total_amount, 
        payment_method,
        shipping_address,
        payment_reference,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING *`,
      [
        order_id,
        id_produit,
        product.id_user,
        userId,
        buyer_name,
        buyer_email,
        quantity,
        unit_price,
        total_amount,
        payment_method,
        shipping_address || null,
        payment_reference || null,
        payment_method === 'mobile_money' && !payment_reference ? 'pending' : 'completed'
      ]
    );

    console.log('✅ Sale created:', order_id);

    // Mettre à jour la quantité du produit
    await client.query(
      'UPDATE products SET quantite = quantite - $1 WHERE id_produit = $2',
      [quantity, id_produit]
    );

    console.log('✅ Product quantity reduced');

    // Gérer le stock
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const firstDayOfMonth = new Date(year, month - 1, 1);

    const currentStockResult = await client.query(
      `SELECT * FROM stock_records 
       WHERE id_produit = $1 
       AND EXTRACT(YEAR FROM date) = $2 
       AND EXTRACT(MONTH FROM date) = $3
       ORDER BY date DESC
       LIMIT 1`,
      [id_produit, year, month]
    );

    let currentStock;

    if (currentStockResult.rows.length > 0) {
      currentStock = currentStockResult.rows[0];
    } else {
      const previousStockResult = await client.query(
        `SELECT * FROM stock_records 
         WHERE id_produit = $1 
         AND date < $2
         ORDER BY date DESC
         LIMIT 1`,
        [id_produit, firstDayOfMonth]
      );

      let quantite_ouverture = 0;
      if (previousStockResult.rows.length > 0) {
        quantite_ouverture = previousStockResult.rows[0].stock_actuel || 0;
      } else {
        quantite_ouverture = product.quantite + quantity;
      }

      const valeur_stock = quantite_ouverture * unit_price;

      const newStockResult = await client.query(
        `INSERT INTO stock_records (
          date, id_produit, quantite_ouverture_mois, quantite_vendu_mois,
          stock_actuel, quantite_approvisionner, valeur_stock, prix_unitaire
        ) VALUES ($1, $2, $3, 0, $4, 0, $5, $6)
        RETURNING *`,
        [firstDayOfMonth, id_produit, quantite_ouverture, quantite_ouverture, valeur_stock, unit_price]
      );

      currentStock = newStockResult.rows[0];
    }

    const newQuantiteVendu = parseInt(currentStock.quantite_vendu_mois || 0) + parseInt(quantity);
    const newStockActuel = parseInt(currentStock.stock_actuel) - parseInt(quantity);
    const newValeurStock = newStockActuel * parseFloat(unit_price);

    await client.query(
      `UPDATE stock_records 
       SET quantite_vendu_mois = $1,
           stock_actuel = $2,
           valeur_stock = $3
       WHERE id_stock = $4`,
      [newQuantiteVendu, newStockActuel, newValeurStock, currentStock.id_stock]
    );

    console.log('✅ ========================================');
    console.log('✅ SALE COMPLETED SUCCESSFULLY');
    console.log('✅ ========================================');

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Sale created successfully and stock updated',
      sale: saleResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ========================================');
    console.error('❌ ERROR CREATING SALE');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// ============================================
// CREATE BULK SALES
// ============================================
exports.createBulkSales = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      items,
      payment_method,
      shipping_address,
      payment_reference,
      order_id: providedOrderId
    } = req.body;

    const userId = req.user.id;
    const buyer_name = `${req.user.first_name} ${req.user.last_name}`;
    const buyer_email = req.user.email;

    console.log('🛒 ========================================');
    console.log('🛒 CREATING BULK SALES');
    console.log('🛒 Number of items:', items?.length);
    console.log('🛒 Buyer:', buyer_name, `(ID: ${userId})`);
    console.log('🛒 Payment Method:', payment_method);
    console.log('🛒 Payment Reference:', payment_reference || 'None');
    console.log('🛒 ========================================');

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    if (!payment_method) {
      return res.status(400).json({ message: 'Payment method is required' });
    }

    await client.query('BEGIN');

    const createdSales = [];
    const errors = [];

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const firstDayOfMonth = new Date(year, month - 1, 1);

    // ✅ Utiliser le même order_id pour tous les items du panier
    const order_id = providedOrderId || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    for (const item of items) {
      try {
        const { id_produit, quantity } = item;

        console.log(`   Processing product ${id_produit}...`);

        const productResult = await client.query(
          'SELECT id_produit, nom_produit, prix, quantite, id_user FROM products WHERE id_produit = $1',
          [id_produit]
        );

        if (productResult.rows.length === 0) {
          errors.push({ id_produit, error: 'Product not found' });
          continue;
        }

        const product = productResult.rows[0];

        if (product.quantite < quantity) {
          errors.push({ 
            id_produit, 
            nom_produit: product.nom_produit,
            error: `Insufficient stock. Only ${product.quantite} available` 
          });
          continue;
        }

        const unit_price = parseFloat(product.prix);
        const total_amount = unit_price * quantity;

        // ✅ Créer la vente avec payment_reference et order_id
        const saleResult = await client.query(
          `INSERT INTO sales (
            order_id, 
            id_produit, 
            id_seller, 
            id_buyer, 
            buyer_name, 
            buyer_email, 
            quantity, 
            unit_price, 
            total_amount, 
            payment_method, 
            shipping_address,
            payment_reference,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
          RETURNING *`,
          [
            order_id,
            id_produit, 
            product.id_user,
            userId,
            buyer_name, 
            buyer_email, 
            quantity, 
            unit_price, 
            total_amount, 
            payment_method, 
            shipping_address || null,
            payment_reference || null,
            payment_method === 'mobile_money' && !payment_reference ? 'pending' : 'completed'
          ]
        );

        // Mettre à jour la quantité du produit
        await client.query(
          'UPDATE products SET quantite = quantite - $1 WHERE id_produit = $2',
          [quantity, id_produit]
        );

        // Gérer le stock
        const currentStockResult = await client.query(
          `SELECT * FROM stock_records 
           WHERE id_produit = $1 
           AND EXTRACT(YEAR FROM date) = $2 
           AND EXTRACT(MONTH FROM date) = $3
           ORDER BY date DESC
           LIMIT 1`,
          [id_produit, year, month]
        );

        let currentStock;

        if (currentStockResult.rows.length > 0) {
          currentStock = currentStockResult.rows[0];
        } else {
          const previousStockResult = await client.query(
            `SELECT * FROM stock_records 
             WHERE id_produit = $1 
             AND date < $2
             ORDER BY date DESC
             LIMIT 1`,
            [id_produit, firstDayOfMonth]
          );

          let quantite_ouverture = 0;
          if (previousStockResult.rows.length > 0) {
            quantite_ouverture = previousStockResult.rows[0].stock_actuel || 0;
          } else {
            quantite_ouverture = product.quantite + quantity;
          }

          const valeur_stock = quantite_ouverture * unit_price;

          const newStockResult = await client.query(
            `INSERT INTO stock_records (
              date, id_produit, quantite_ouverture_mois, quantite_vendu_mois,
              stock_actuel, quantite_approvisionner, valeur_stock, prix_unitaire
            ) VALUES ($1, $2, $3, 0, $4, 0, $5, $6)
            RETURNING *`,
            [firstDayOfMonth, id_produit, quantite_ouverture, quantite_ouverture, valeur_stock, unit_price]
          );

          currentStock = newStockResult.rows[0];
        }

        const newQuantiteVendu = parseInt(currentStock.quantite_vendu_mois || 0) + parseInt(quantity);
        const newStockActuel = parseInt(currentStock.stock_actuel) - parseInt(quantity);
        const newValeurStock = newStockActuel * parseFloat(unit_price);

        await client.query(
          `UPDATE stock_records 
           SET quantite_vendu_mois = $1,
               stock_actuel = $2,
               valeur_stock = $3
           WHERE id_stock = $4`,
          [newQuantiteVendu, newStockActuel, newValeurStock, currentStock.id_stock]
        );

        createdSales.push(saleResult.rows[0]);
        console.log(`   ✅ Sale created for product ${id_produit}`);

      } catch (itemError) {
        console.error(`   ❌ Error with product ${item.id_produit}:`, itemError.message);
        errors.push({ 
          id_produit: item.id_produit, 
          error: itemError.message 
        });
      }
    }

    if (createdSales.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: 'All sales failed', 
        errors 
      });
    }

    await client.query('COMMIT');

    console.log('✅ ========================================');
    console.log(`✅ ${createdSales.length} SALE(S) CREATED SUCCESSFULLY`);
    if (errors.length > 0) {
      console.log(`⚠️ ${errors.length} ERROR(S) OCCURRED`);
    }
    console.log('✅ ========================================');

    res.status(201).json({
      message: `${createdSales.length} sale(s) created successfully`,
      sales: createdSales,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ========================================');
    console.error('❌ ERROR CREATING BULK SALES');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// ============================================
// UPDATE SALE STATUS
// ============================================
exports.updateSaleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['completed', 'pending', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const result = await query(
      'UPDATE sales SET status = $1 WHERE id_sale = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error updating sale status:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// DELETE SALE (AVEC VÉRIFICATION DES PERMISSIONS)
// ============================================
exports.deleteSale = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🗑️ ========================================');
    console.log('🗑️ ATTEMPTING TO DELETE SALE');
    console.log('🗑️ Sale ID:', id);
    console.log('🗑️ User ID:', userId);
    console.log('🗑️ User Role:', userRole);
    console.log('🗑️ ========================================');

    await client.query('BEGIN');

    const saleResult = await client.query(
      'SELECT * FROM sales WHERE id_sale = $1',
      [id]
    );

    if (saleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Sale not found' });
    }

    const sale = saleResult.rows[0];
    const { id_produit, id_seller, quantity, unit_price, sale_date } = sale;

    // ✅ VÉRIFICATION DES PERMISSIONS
    if (userRole !== 'admin' && userId !== id_seller) {
      await client.query('ROLLBACK');
      console.log('❌ Access denied - User is not admin or owner');
      return res.status(403).json({ 
        message: 'Access denied. Only admins or the seller who created this sale can delete it.',
        reason: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    console.log('✅ Permission granted');

    const productResult = await client.query(
      'SELECT id_produit, nom_produit, quantite FROM products WHERE id_produit = $1',
      [id_produit]
    );

    if (productResult.rows.length === 0) {
      console.log('⚠️ Product no longer exists - stock will not be updated');
      
      await client.query('DELETE FROM sales WHERE id_sale = $1', [id]);
      await client.query('COMMIT');
      
      return res.json({
        message: 'Sale deleted successfully. Note: Product no longer exists, stock was not updated.',
        warning: 'PRODUCT_NOT_FOUND'
      });
    }

    const product = productResult.rows[0];

    // Remettre la quantité dans le produit
    await client.query(
      'UPDATE products SET quantite = quantite + $1 WHERE id_produit = $2',
      [quantity, id_produit]
    );

    console.log('✅ Product quantity restored');

    // Mettre à jour le stock
    const saleDate = new Date(sale_date);
    const year = saleDate.getFullYear();
    const month = saleDate.getMonth() + 1;

    const stockResult = await client.query(
      `SELECT * FROM stock_records 
       WHERE id_produit = $1 
       AND EXTRACT(YEAR FROM date) = $2 
       AND EXTRACT(MONTH FROM date) = $3
       ORDER BY date DESC
       LIMIT 1`,
      [id_produit, year, month]
    );

    if (stockResult.rows.length > 0) {
      const currentStock = stockResult.rows[0];
      
      const newQuantiteVendu = Math.max(0, parseInt(currentStock.quantite_vendu_mois || 0) - parseInt(quantity));
      const newStockActuel = parseInt(currentStock.stock_actuel) + parseInt(quantity);
      const newValeurStock = newStockActuel * parseFloat(unit_price);

      await client.query(
        `UPDATE stock_records 
         SET quantite_vendu_mois = $1,
             stock_actuel = $2,
             valeur_stock = $3
         WHERE id_stock = $4`,
        [newQuantiteVendu, newStockActuel, newValeurStock, currentStock.id_stock]
      );

      console.log('✅ Stock record updated');
    }

    // Supprimer la vente
    await client.query('DELETE FROM sales WHERE id_sale = $1', [id]);

    console.log('✅ ========================================');
    console.log('✅ SALE DELETED SUCCESSFULLY');
    console.log('✅ ========================================');

    await client.query('COMMIT');

    res.json({ 
      message: 'Sale deleted successfully. Product quantity and stock have been restored.',
      restored_quantity: quantity,
      product_name: product.nom_produit
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ERROR DELETING SALE:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};
