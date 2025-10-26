// backend/controllers/productController.js
const { query } = require('../db');
const cloudinary = require('../config/cloudinary');

// ============================================
// GET ALL PRODUCTS (with optional user filter)
// ============================================
exports.getAllProducts = async (req, res) => {
  try {
    const { id_user } = req.query;

    console.log('🔍 ========================================');
    console.log('🔍 GET ALL PRODUCTS REQUEST');
    console.log('🔍 Query param id_user:', id_user);
    console.log('🔍 ========================================');

    let sql = `
      SELECT 
        p.id_produit, 
        p.id_user, 
        p.nom_produit, 
        p.categorie, 
        p.prix, 
        p.quantite, 
        p.photo, 
        p.description,
        p.date_creation,
        CONCAT(u.first_name, ' ', u.last_name) as nom_createur
      FROM products p
      LEFT JOIN users u ON p.id_user = u.id
    `;

    const params = [];

    if (id_user) {
      sql += ' WHERE p.id_user = $1';
      params.push(id_user);
      console.log('✅ Filtering by user ID:', id_user);
    } else {
      console.log('⚠️ NO FILTER - Returning ALL products');
    }

    sql += ' ORDER BY p.date_creation DESC';

    console.log('📝 SQL Query:', sql);
    console.log('📝 Params:', params);

    const result = await query(sql, params);
    
    console.log('✅ Products found:', result.rows.length);
    console.log('✅ ========================================');

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching products:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// GET PRODUCT BY ID
// ============================================
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        p.id_produit, 
        p.id_user, 
        p.nom_produit, 
        p.categorie, 
        p.prix, 
        p.quantite, 
        p.photo, 
        p.description,
        p.date_creation,
        CONCAT(u.first_name, ' ', u.last_name) as nom_createur,
        u.email as creator_email
      FROM products p
      LEFT JOIN users u ON p.id_user = u.id
      WHERE p.id_produit = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error fetching product:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// CREATE PRODUCT
// ============================================
exports.createProduct = async (req, res) => {
  try {
    const { id_user, nom_produit, categorie, prix, quantite, photo, description } = req.body;

    console.log('📦 ========================================');
    console.log('📦 CREATING NEW PRODUCT');
    console.log('📦 User ID:', id_user);
    console.log('📦 Name:', nom_produit);
    console.log('📦 Category:', categorie);
    console.log('📦 Price:', prix, 'FCFA');
    console.log('📦 Quantity:', quantite);
    console.log('📦 ========================================');

    // Validation
    if (!id_user || !nom_produit || !categorie || prix === undefined || quantite === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Insérer le produit
    const productResult = await query(
      `INSERT INTO products (id_user, nom_produit, categorie, prix, quantite, photo, description) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [id_user, nom_produit, categorie, prix, quantite, photo || '', description || '']
    );

    const newProduct = productResult.rows[0];
    console.log('✅ Product created with ID:', newProduct.id_produit);

    // Calculer la valeur du stock
    const valeurStock = parseFloat(prix) * parseInt(quantite);

    // Créer l'entrée stock_records correspondante
    await query(
      `INSERT INTO stock_records (
        date, 
        id_produit, 
        quantite_ouverture_mois,
        stock_actuel, 
        valeur_stock, 
        prix_unitaire
      ) 
      VALUES (CURRENT_DATE, $1, $2, $3, $4, $5)`,
      [newProduct.id_produit, quantite, quantite, valeurStock, prix]
    );

    console.log('✅ ========================================');
    console.log('✅ STOCK RECORD CREATED');
    console.log('✅ Stock value:', valeurStock, 'FCFA');
    console.log('✅ Calculation:', prix, 'FCFA ×', quantite, 'units');
    console.log('✅ ========================================');

    res.status(201).json({
      message: 'Product and stock created successfully',
      product: newProduct
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR CREATING PRODUCT');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// UPDATE PRODUCT
// ============================================
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom_produit, categorie, prix, photo, description } = req.body;

    console.log('📝 ========================================');
    console.log('📝 UPDATING PRODUCT');
    console.log('📝 Product ID:', id);
    console.log('📝 New price:', prix, 'FCFA');
    console.log('📝 ========================================');

    // Validation
    if (!nom_produit || !categorie || prix === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Récupérer la quantité actuelle du produit
    const currentProduct = await query(
      'SELECT quantite FROM products WHERE id_produit = $1',
      [id]
    );

    if (currentProduct.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const currentQuantity = currentProduct.rows[0].quantite;

    // Mettre à jour le produit
    const result = await query(
      `UPDATE products 
       SET nom_produit = $1, categorie = $2, prix = $3, photo = $4, description = $5
       WHERE id_produit = $6 
       RETURNING *`,
      [nom_produit, categorie, prix, photo, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('✅ Product updated successfully');

    // ⚡ MISE À JOUR AUTOMATIQUE DU STOCK VALUE
    const newValeurStock = parseFloat(prix) * parseInt(currentQuantity);

    await query(
      `UPDATE stock_records 
       SET valeur_stock = $1, prix_unitaire = $2
       WHERE id_produit = $3`,
      [newValeurStock, prix, id]
    );

    console.log('✅ ========================================');
    console.log('✅ STOCK VALUE UPDATED');
    console.log('✅ New value:', newValeurStock, 'FCFA');
    console.log('✅ Calculation:', prix, 'FCFA ×', currentQuantity, 'units');
    console.log('✅ ========================================');

    res.json({
      message: 'Product and stock value updated successfully',
      product: result.rows[0],
      stockValue: newValeurStock
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR UPDATING PRODUCT');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// DELETE PRODUCT (AVEC CASCADE POUR STOCK_RECORDS)
// ============================================
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ ========================================');
    console.log('🗑️ ATTEMPTING TO DELETE PRODUCT');
    console.log('🗑️ Product ID:', id);
    console.log('🗑️ ========================================');

    // Vérifier si le produit existe
    const productCheck = await query(
      'SELECT id_produit, nom_produit, photo FROM products WHERE id_produit = $1',
      [id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = productCheck.rows[0];
    console.log('📦 Product found:', product.nom_produit);

    // ✅ VÉRIFIER LES DÉPENDANCES CRITIQUES (SAUF STOCK_RECORDS)
    const dependencies = [];

    // ✅ ON NE VÉRIFIE PLUS STOCK_RECORDS - ILS SERONT SUPPRIMÉS EN CASCADE
    console.log('⚡ Stock records will be automatically deleted (CASCADE)');

    // VÉRIFICATION 1 : Sales
    const salesCheck = await query(
      'SELECT COUNT(*) as count FROM sales WHERE id_produit = $1',
      [id]
    );
    const salesCount = parseInt(salesCheck.rows[0].count);
    if (salesCount > 0) {
      dependencies.push({
        type: 'sales',
        count: salesCount,
        message: `${salesCount} sale(s)`
      });
      console.log('❌ Product has sales:', salesCount);
    }

    // VÉRIFICATION 2 : Supplies
    const suppliesCheck = await query(
      'SELECT COUNT(*) as count FROM supplies WHERE id_produit = $1',
      [id]
    );
    const suppliesCount = parseInt(suppliesCheck.rows[0].count);
    if (suppliesCount > 0) {
      dependencies.push({
        type: 'supplies',
        count: suppliesCount,
        message: `${suppliesCount} supply record(s)`
      });
      console.log('❌ Product has supplies:', suppliesCount);
    }

    // VÉRIFICATION 3 : Reviews
    const reviewsCheck = await query(
      'SELECT COUNT(*) as count FROM reviews WHERE id_produit = $1',
      [id]
    );
    const reviewsCount = parseInt(reviewsCheck.rows[0].count);
    if (reviewsCount > 0) {
      dependencies.push({
        type: 'reviews',
        count: reviewsCount,
        message: `${reviewsCount} customer review(s)`
      });
      console.log('❌ Product has reviews:', reviewsCount);
    }

    // ✅ SI DES DÉPENDANCES CRITIQUES EXISTENT, BLOQUER LA SUPPRESSION
    if (dependencies.length > 0) {
      console.log('❌ Cannot delete - Product has critical dependencies:', dependencies.length);
      
      // Construire le message détaillé
      let detailedMessage = `Cannot delete "${product.nom_produit}". To delete this product, you must first delete:\n\n`;
      
      dependencies.forEach((dep, index) => {
        detailedMessage += `${index + 1}. ${dep.message}\n`;
      });
      
      detailedMessage += '\nNote: Stock records will be automatically deleted with the product.';

      return res.status(400).json({ 
        message: detailedMessage,
        dependencies: dependencies,
        productName: product.nom_produit
      });
    }

    console.log('✅ All checks passed - Product can be deleted');

    // Compter les stock records qui vont être supprimés
    const stockCountResult = await query(
      'SELECT COUNT(*) as count FROM stock_records WHERE id_produit = $1',
      [id]
    );
    const stockCount = parseInt(stockCountResult.rows[0].count);

    // ✅ SUPPRESSION : Supprimer l'image de Cloudinary si elle existe
    const photoUrl = product.photo;
    if (photoUrl && photoUrl.includes('cloudinary.com')) {
      try {
        const publicIdMatch = photoUrl.match(/\/products\/([^/.]+)/);
        if (publicIdMatch) {
          const publicId = `products/${publicIdMatch[1]}`;
          await cloudinary.uploader.destroy(publicId);
          console.log('✅ Image deleted from Cloudinary:', publicId);
        }
      } catch (cloudinaryError) {
        console.log('⚠️ Error deleting image from Cloudinary:', cloudinaryError.message);
      }
    }

    // ✅ SUPPRESSION : Supprimer le produit (CASCADE va supprimer les stock_records automatiquement)
    await query('DELETE FROM products WHERE id_produit = $1', [id]);
    
    console.log('✅ ========================================');
    console.log('✅ PRODUCT DELETED SUCCESSFULLY');
    console.log(`✅ ${stockCount} stock record(s) automatically deleted (CASCADE)`);
    console.log('✅ ========================================');

    res.json({ 
      message: 'Product deleted successfully',
      productName: product.nom_produit,
      deletedStockRecords: stockCount
    });
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR DELETING PRODUCT');
    console.error('❌ Error:', error.message);
    console.error('❌ ========================================');
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// GET PRODUCTS BY CATEGORY
// ============================================
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const result = await query(
      `SELECT 
        p.id_produit, 
        p.id_user, 
        p.nom_produit, 
        p.categorie, 
        p.prix, 
        p.quantite, 
        p.photo, 
        p.description,
        p.date_creation,
        CONCAT(u.first_name, ' ', u.last_name) as nom_createur
      FROM products p
      LEFT JOIN users u ON p.id_user = u.id
      WHERE p.categorie = $1
      ORDER BY p.date_creation DESC`,
      [category]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching products by category:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============================================
// SEARCH PRODUCTS
// ============================================
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const result = await query(
      `SELECT 
        p.id_produit, 
        p.id_user, 
        p.nom_produit, 
        p.categorie, 
        p.prix, 
        p.quantite, 
        p.photo, 
        p.description,
        p.date_creation,
        CONCAT(u.first_name, ' ', u.last_name) as nom_createur
      FROM products p
      LEFT JOIN users u ON p.id_user = u.id
      WHERE 
        p.nom_produit ILIKE $1 OR 
        p.categorie ILIKE $1 OR 
        p.description ILIKE $1
      ORDER BY p.date_creation DESC`,
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error searching products:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};