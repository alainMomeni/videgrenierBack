// backend/scripts/dbStats.js
const { query, pool } = require('../db');

const getStats = async () => {
  try {
    console.log('📊 Database Statistics\n');
    console.log('='.repeat(50));
    
    // Users stats
    const usersStats = await query(`
      SELECT 
        role,
        COUNT(*) as total,
        SUM(CASE WHEN email_verified = true THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN is_blocked = true THEN 1 ELSE 0 END) as blocked
      FROM users
      GROUP BY role
      ORDER BY role
    `);
    
    console.log('\n👥 USERS:');
    let totalUsers = 0;
    usersStats.rows.forEach(stat => {
      totalUsers += parseInt(stat.total);
      console.log(`   ${stat.role}: ${stat.total} (${stat.verified} verified, ${stat.blocked} blocked)`);
    });
    console.log(`   TOTAL: ${totalUsers} users`);
    
    // Products stats
    const productsStats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT id_user) as sellers,
        SUM(quantite) as total_quantity,
        AVG(prix)::DECIMAL(10,2) as avg_price
      FROM products
    `);
    
    console.log('\n📦 PRODUCTS:');
    const pStats = productsStats.rows[0];
    console.log(`   Total products: ${pStats.total}`);
    console.log(`   Total sellers: ${pStats.sellers}`);
    console.log(`   Total quantity: ${pStats.total_quantity}`);
    console.log(`   Average price: $${pStats.avg_price || 0}`);
    
    // Products by category
    const categoryStats = await query(`
      SELECT categorie, COUNT(*) as count
      FROM products
      GROUP BY categorie
      ORDER BY count DESC
    `);
    
    if (categoryStats.rows.length > 0) {
      console.log('\n   By category:');
      categoryStats.rows.forEach(cat => {
        console.log(`     - ${cat.categorie}: ${cat.count}`);
      });
    }
    
    // Sales stats
    const salesStats = await query(`
      SELECT 
        COUNT(*) as total_sales,
        SUM(total_amount)::DECIMAL(10,2) as total_revenue,
        COUNT(DISTINCT id_seller) as active_sellers,
        status,
        COUNT(*) as count_by_status
      FROM sales
      GROUP BY status
    `);
    
    console.log('\n💰 SALES:');
    const totalSales = await query('SELECT COUNT(*) as count, SUM(total_amount)::DECIMAL(10,2) as revenue FROM sales');
    console.log(`   Total sales: ${totalSales.rows[0].count}`);
    console.log(`   Total revenue: $${totalSales.rows[0].revenue || 0}`);
    
    if (salesStats.rows.length > 0) {
      console.log('\n   By status:');
      salesStats.rows.forEach(stat => {
        console.log(`     - ${stat.status}: ${stat.count_by_status} sales`);
      });
    }
    
    // Reviews stats
    const reviewsStats = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(rating)::DECIMAL(3,2) as avg_rating
      FROM reviews
      GROUP BY status
    `);
    
    console.log('\n⭐ REVIEWS:');
    const totalReviews = await query('SELECT COUNT(*) as count FROM reviews');
    console.log(`   Total reviews: ${totalReviews.rows[0].count}`);
    
    if (reviewsStats.rows.length > 0) {
      reviewsStats.rows.forEach(stat => {
        console.log(`   ${stat.status}: ${stat.count} (avg rating: ${stat.avg_rating || 0})`);
      });
    }
    
    // Suppliers stats
    const suppliersCount = await query('SELECT COUNT(*) as count FROM suppliers');
    console.log('\n🏭 SUPPLIERS:');
    console.log(`   Total suppliers: ${suppliersCount.rows[0].count}`);
    
    // Newsletters stats
    const newslettersStats = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active
      FROM newsletters
    `);
    
    console.log('\n📧 NEWSLETTERS:');
    const nStats = newslettersStats.rows[0];
    console.log(`   Total subscribers: ${nStats.total}`);
    console.log(`   Active subscribers: ${nStats.active}`);
    
    console.log('\n' + '='.repeat(50));
    
    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
};

getStats();