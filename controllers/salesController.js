// backend/controllers/salesController.js
const { query, pool } = require('../db'); // ← CORRECTION ICI

// GET toutes les ventes
exports.getAllSales = async (req, res) => {
  try {
    const { sellerId } = req.query;
    
    let queryStr = `
      SELECT 
        s.id_sale, 
        s.order_id, 
        s.id_produit, 
        s.id_seller, 
        s.buyer_name, 
        s.buyer_email, 
        s.quantity, 
        s.unit_price, 
        s.total_amount, 
        s.sale_date, 
        s.status, 
        s.payment_method,
        p.nom_produit,
        p.photo
      FROM sales s
      LEFT JOIN products p ON s.id_produit = p.id_produit
    `;
    
    const params = [];
    if (sellerId) {
      queryStr += ' WHERE s.id_seller = $1';
      params.push(sellerId);
    }
    
    queryStr += ' ORDER BY s.sale_date DESC';
    
    const result = await query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET une vente par ID
exports.getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        s.*, 
        p.nom_produit,
        p.photo
      FROM sales s
      LEFT JOIN products p ON s.id_produit = p.id_produit
      WHERE s.id_sale = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST créer une vente avec mise à jour automatique du stock
exports.createSale = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      id_produit, 
      buyer_name, 
      buyer_email, 
      quantity, 
      payment_method,
      shipping_address
    } = req.body;

    if (!id_produit || !buyer_name || !buyer_email || !quantity || !payment_method) {
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
    const order_id = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const saleResult = await client.query(
      `INSERT INTO sales (
        order_id, 
        id_produit, 
        id_seller, 
        buyer_name, 
        buyer_email, 
        quantity, 
        unit_price, 
        total_amount, 
        payment_method,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        order_id,
        id_produit,
        product.id_user,
        buyer_name,
        buyer_email,
        quantity,
        unit_price,
        total_amount,
        payment_method,
        'completed'
      ]
    );

    await client.query(
      'UPDATE products SET quantite = quantite - $1 WHERE id_produit = $2',
      [quantity, id_produit]
    );

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);

    const stockRecordResult = await client.query(
      `SELECT id_stock, stock_actuel, quantite_vendu_mois 
       FROM stock_records 
       WHERE id_produit = $1 AND date >= $2
       ORDER BY date DESC 
       LIMIT 1`,
      [id_produit, firstDayOfMonth]
    );

    if (stockRecordResult.rows.length > 0) {
      const stockRecord = stockRecordResult.rows[0];
      await client.query(
        `UPDATE stock_records 
         SET stock_actuel = stock_actuel - $1,
             quantite_vendu_mois = quantite_vendu_mois + $1,
             valeur_stock = (stock_actuel - $1) * prix_unitaire
         WHERE id_stock = $2`,
        [quantity, stockRecord.id_stock]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Sale created successfully and stock updated',
      sale: saleResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating sale:', error.message);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// POST créer plusieurs ventes (checkout panier complet)
exports.createBulkSales = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      items,
      buyer_name, 
      buyer_email, 
      payment_method,
      shipping_address
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    if (!buyer_name || !buyer_email || !payment_method) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await client.query('BEGIN');

    const createdSales = [];
    const errors = [];

    for (const item of items) {
      try {
        const { id_produit, quantity } = item;

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
        const order_id = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const saleResult = await client.query(
          `INSERT INTO sales (
            order_id, id_produit, id_seller, buyer_name, buyer_email, 
            quantity, unit_price, total_amount, payment_method, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
          RETURNING *`,
          [order_id, id_produit, product.id_user, buyer_name, buyer_email, 
           quantity, unit_price, total_amount, payment_method, 'completed']
        );

        await client.query(
          'UPDATE products SET quantite = quantite - $1 WHERE id_produit = $2',
          [quantity, id_produit]
        );

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);

        const stockRecordResult = await client.query(
          `SELECT id_stock FROM stock_records 
           WHERE id_produit = $1 AND date >= $2
           ORDER BY date DESC LIMIT 1`,
          [id_produit, firstDayOfMonth]
        );

        if (stockRecordResult.rows.length > 0) {
          await client.query(
            `UPDATE stock_records 
             SET stock_actuel = stock_actuel - $1,
                 quantite_vendu_mois = quantite_vendu_mois + $1,
                 valeur_stock = (stock_actuel - $1) * prix_unitaire
             WHERE id_stock = $2`,
            [quantity, stockRecordResult.rows[0].id_stock]
          );
        }

        createdSales.push(saleResult.rows[0]);

      } catch (itemError) {
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

    res.status(201).json({
      message: `${createdSales.length} sale(s) created successfully`,
      sales: createdSales,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating bulk sales:', error.message);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// PUT mettre à jour le statut d'une vente
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
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE une vente
exports.deleteSale = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM sales WHERE id_sale = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }
    
    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
};