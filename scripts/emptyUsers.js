// backend/scripts/emptyUsers.js
const { query, pool } = require('../db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

const emptyUsers = async () => {
  try {
    console.log('⚠️  DELETE ALL USERS ⚠️\n');
    
    // Compter d'abord
    const count = await query('SELECT COUNT(*) FROM users');
    console.log(`Found ${count.rows[0].count} users in database\n`);
    
    if (count.rows[0].count === 0) {
      console.log('✅ No users to delete');
      rl.close();
      pool.end();
      process.exit(0);
      return;
    }
    
    // Afficher les utilisateurs
    const users = await query('SELECT id, email, role::text FROM users ORDER BY id');
    console.log('Users that will be deleted:');
    users.rows.forEach(user => {
      console.log(`   ${user.id}. ${user.email} (${user.role})`);
    });
    
    // Afficher l'impact sur les données liées
    console.log('\n📊 Related data that will also be deleted:');
    
    const relatedData = await Promise.all([
      query('SELECT COUNT(*) FROM products WHERE id_user IN (SELECT id FROM users)'),
      query('SELECT COUNT(*) FROM sales WHERE id_seller IN (SELECT id FROM users)'),
      query('SELECT COUNT(*) FROM supplies WHERE id_user IN (SELECT id FROM users)'),
      query('SELECT COUNT(*) FROM cart_items WHERE id_user IN (SELECT id FROM users)'),
    ]);
    
    console.log(`   Products: ${relatedData[0].rows[0].count}`);
    console.log(`   Sales: ${relatedData[1].rows[0].count}`);
    console.log(`   Supplies: ${relatedData[2].rows[0].count}`);
    console.log(`   Cart items: ${relatedData[3].rows[0].count}`);
    
    console.log('\n⚠️  WARNING: This action cannot be undone!\n');
    
    const answer = await askQuestion('Type "DELETE ALL USERS" to confirm: ');
    
    if (answer === 'DELETE ALL USERS') {
      console.log('\n🗑️  Deleting all data...\n');
      
      // Supprimer dans l'ordre (données liées d'abord)
      console.log('1️⃣ Deleting cart items...');
      await query('DELETE FROM cart_items WHERE id_user IN (SELECT id FROM users)');
      console.log('   ✅ Cart items deleted');
      
      console.log('2️⃣ Deleting reviews...');
      await query('DELETE FROM reviews WHERE id_produit IN (SELECT id_produit FROM products WHERE id_user IN (SELECT id FROM users))');
      console.log('   ✅ Reviews deleted');
      
      console.log('3️⃣ Deleting sales...');
      await query('DELETE FROM sales WHERE id_seller IN (SELECT id FROM users)');
      console.log('   ✅ Sales deleted');
      
      console.log('4️⃣ Deleting stock records...');
      await query('DELETE FROM stock_records WHERE id_produit IN (SELECT id_produit FROM products WHERE id_user IN (SELECT id FROM users))');
      console.log('   ✅ Stock records deleted');
      
      console.log('5️⃣ Deleting supplies...');
      await query('DELETE FROM supplies WHERE id_user IN (SELECT id FROM users)');
      console.log('   ✅ Supplies deleted');
      
      console.log('6️⃣ Deleting products...');
      await query('DELETE FROM products WHERE id_user IN (SELECT id FROM users)');
      console.log('   ✅ Products deleted');
      
      console.log('7️⃣ Deleting users...');
      const result = await query('DELETE FROM users RETURNING email');
      console.log(`   ✅ ${result.rows.length} users deleted`);
      
      // Réinitialiser les auto-increments
      console.log('\n🔄 Resetting sequences...');
      await query('ALTER SEQUENCE users_id_seq RESTART WITH 1');
      await query('ALTER SEQUENCE products_id_produit_seq RESTART WITH 1');
      await query('ALTER SEQUENCE sales_id_sale_seq RESTART WITH 1');
      await query('ALTER SEQUENCE stock_records_id_stock_seq RESTART WITH 1');
      await query('ALTER SEQUENCE supplies_id_supply_seq RESTART WITH 1');
      await query('ALTER SEQUENCE reviews_id_review_seq RESTART WITH 1');
      await query('ALTER SEQUENCE cart_items_id_cart_seq RESTART WITH 1');
      console.log('✅ All sequences reset to 1');
      
      console.log('\n✅ All users and related data successfully deleted!');
      
    } else {
      console.log('❌ Operation cancelled');
    }
    
    rl.close();
    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    pool.end();
    process.exit(1);
  }
};

emptyUsers();