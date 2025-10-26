// backend/helpers/stockHelper.js
const { query } = require('../db');

/**
 * Obtient ou crée le stock du mois en cours pour un produit
 * @param {number} id_produit - ID du produit
 * @returns {object} Stock record du mois en cours
 */
async function getCurrentMonthStock(id_produit) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const firstDayOfMonth = new Date(year, month - 1, 1);

  console.log(`🔍 Checking stock for product ${id_produit} - ${month}/${year}`);

  // Chercher le stock du mois en cours
  const currentStockResult = await query(
    `SELECT * FROM stock_records 
     WHERE id_produit = $1 
     AND EXTRACT(YEAR FROM date) = $2 
     AND EXTRACT(MONTH FROM date) = $3
     ORDER BY date DESC
     LIMIT 1`,
    [id_produit, year, month]
  );

  // Si le stock du mois existe, le retourner
  if (currentStockResult.rows.length > 0) {
    console.log('✅ Current month stock found:', currentStockResult.rows[0].id_stock);
    return currentStockResult.rows[0];
  }

  // Sinon, créer un nouveau stock pour le mois en cours
  console.log('📅 Creating new stock for current month...');

  // Récupérer le stock du mois précédent
  const previousStockResult = await query(
    `SELECT * FROM stock_records 
     WHERE id_produit = $1 
     AND date < $2
     ORDER BY date DESC
     LIMIT 1`,
    [id_produit, firstDayOfMonth]
  );

  let quantite_ouverture = 0;

  if (previousStockResult.rows.length > 0) {
    // Ouverture = Stock actuel du mois précédent
    quantite_ouverture = previousStockResult.rows[0].stock_actuel || 0;
    console.log(`   Opening quantity from previous month: ${quantite_ouverture}`);
  } else {
    // Aucun stock précédent, récupérer la quantité du produit
    const productResult = await query(
      'SELECT quantite FROM products WHERE id_produit = $1',
      [id_produit]
    );
    
    if (productResult.rows.length > 0) {
      quantite_ouverture = productResult.rows[0].quantite || 0;
      console.log(`   Opening quantity from product: ${quantite_ouverture}`);
    }
  }

  // Récupérer le prix unitaire du produit
  const productPriceResult = await query(
    'SELECT prix FROM products WHERE id_produit = $1',
    [id_produit]
  );

  const prix_unitaire = productPriceResult.rows.length > 0 
    ? productPriceResult.rows[0].prix 
    : 0;

  const valeur_stock = quantite_ouverture * prix_unitaire;

  // Créer le nouveau stock
  const newStockResult = await query(
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
    VALUES ($1, $2, $3, 0, $4, 0, $5, $6)
    RETURNING *`,
    [
      firstDayOfMonth,
      id_produit,
      quantite_ouverture,
      quantite_ouverture, // stock_actuel commence à la quantité d'ouverture
      valeur_stock,
      prix_unitaire
    ]
  );

  console.log('✅ New monthly stock created:', newStockResult.rows[0].id_stock);
  console.log(`   Opening: ${quantite_ouverture}, Current: ${quantite_ouverture}`);

  return newStockResult.rows[0];
}

/**
 * Met à jour le stock du mois en cours
 * @param {number} id_stock - ID du stock record
 * @param {object} updates - Mises à jour à appliquer
 */
async function updateCurrentMonthStock(id_stock, updates) {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  Object.keys(updates).forEach(key => {
    setClauses.push(`${key} = $${paramIndex}`);
    values.push(updates[key]);
    paramIndex++;
  });

  values.push(id_stock);

  const updateQuery = `
    UPDATE stock_records 
    SET ${setClauses.join(', ')}
    WHERE id_stock = $${paramIndex}
    RETURNING *
  `;

  const result = await query(updateQuery, values);
  return result.rows[0];
}

module.exports = {
  getCurrentMonthStock,
  updateCurrentMonthStock
};