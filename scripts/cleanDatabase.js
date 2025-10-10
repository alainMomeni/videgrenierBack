// backend/scripts/cleanDatabase.js
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

const cleanDatabase = async () => {
  try {
    console.log('⚠️  DATABASE CLEANUP SCRIPT ⚠️\n');
    console.log('This will DELETE data from your database!\n');
    
    console.log('Options:');
    console.log('1. Delete all unverified users');
    console.log('2. Delete all pending reviews');
    console.log('3. Delete all test data (users with "test" in email)');
    console.log('4. Clean old verification tokens');
    console.log('5. Delete all data (DANGEROUS!)');
    console.log('6. Cancel\n');
    
    const choice = await askQuestion('Enter your choice (1-6): ');
    
    switch (choice) {
      case '1':
        const unverified = await query('SELECT COUNT(*) FROM users WHERE email_verified = false');
        console.log(`\nFound ${unverified.rows[0].count} unverified users`);
        
        const confirm1 = await askQuestion('Delete them? (yes/no): ');
        if (confirm1.toLowerCase() === 'yes') {
          const result = await query('DELETE FROM users WHERE email_verified = false RETURNING email');
          console.log(`✅ Deleted ${result.rows.length} unverified users`);
        }
        break;
        
      case '2':
        const pending = await query("SELECT COUNT(*) FROM reviews WHERE status = 'pending'");
        console.log(`\nFound ${pending.rows[0].count} pending reviews`);
        
        const confirm2 = await askQuestion('Delete them? (yes/no): ');
        if (confirm2.toLowerCase() === 'yes') {
          const result = await query("DELETE FROM reviews WHERE status = 'pending' RETURNING id_review");
          console.log(`✅ Deleted ${result.rows.length} pending reviews`);
        }
        break;
        
      case '3':
        const testUsers = await query("SELECT COUNT(*) FROM users WHERE email LIKE '%test%'");
        console.log(`\nFound ${testUsers.rows[0].count} test users`);
        
        const confirm3 = await askQuestion('Delete them? (yes/no): ');
        if (confirm3.toLowerCase() === 'yes') {
          const result = await query("DELETE FROM users WHERE email LIKE '%test%' RETURNING email");
          console.log(`✅ Deleted ${result.rows.length} test users`);
        }
        break;
        
      case '4':
        const result = await query(`
          UPDATE users 
          SET verification_token = NULL, 
              verification_token_expires = NULL 
          WHERE verification_token_expires < NOW()
          RETURNING email
        `);
        console.log(`✅ Cleaned ${result.rows.length} expired verification tokens`);
        break;
        
      case '5':
        console.log('\n⚠️  THIS WILL DELETE ALL DATA FROM ALL TABLES!');
        const confirm5 = await askQuestion('Type "DELETE EVERYTHING" to confirm: ');
        
        if (confirm5 === 'DELETE EVERYTHING') {
          await query('TRUNCATE TABLE cart_items, reviews, sales, supplies, stock_records, products, newsletters, users RESTART IDENTITY CASCADE');
          console.log('✅ All data deleted');
        } else {
          console.log('❌ Cancelled');
        }
        break;
        
      case '6':
        console.log('❌ Cancelled');
        break;
        
      default:
        console.log('❌ Invalid choice');
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

cleanDatabase();