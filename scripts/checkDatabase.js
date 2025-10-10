// backend/scripts/checkDatabase.js
const { pool, query } = require('../db');

const checkDatabase = async () => {
  try {
    console.log('🔍 Checking database connection and tables...\n');
    
    // Test de connexion
    const testConnection = await query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log(`   Time: ${testConnection.rows[0].now}\n`);
    
    // Vérifier les tables existantes
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`📋 Found ${tables.rows.length} tables:\n`);
    const expectedTables = [
      'users', 
      'products', 
      'stock_records', 
      'suppliers', 
      'supplies', 
      'sales', 
      'reviews', 
      'cart_items',
      'newsletters'
    ];
    
    expectedTables.forEach(tableName => {
      const exists = tables.rows.some(t => t.table_name === tableName);
      console.log(`   ${exists ? '✅' : '❌'} ${tableName}`);
    });
    
    // Vérifier les ENUMs
    console.log('\n📝 Checking ENUMs:');
    const enums = await query(`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e'
      ORDER BY typname
    `);
    
    const expectedEnums = [
      'user_role',
      'supply_status',
      'payment_method',
      'sale_status',
      'review_status'
    ];
    
    expectedEnums.forEach(enumName => {
      const exists = enums.rows.some(e => e.typname === enumName);
      console.log(`   ${exists ? '✅' : '❌'} ${enumName}`);
    });
    
    // Vérifier la structure de la table users
    const usersTable = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    if (usersTable.rows.length > 0) {
      console.log('\n✅ Users table structure:');
      usersTable.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // Vérifier les colonnes importantes
      const requiredColumns = [
        'id', 'first_name', 'last_name', 'email', 'password_hash', 
        'role', 'email_verified', 'verification_token', 
        'verification_token_expires', 'is_blocked'
      ];
      
      console.log('\n🔍 Checking required columns:');
      requiredColumns.forEach(col => {
        const exists = usersTable.rows.some(c => c.column_name === col);
        console.log(`   ${exists ? '✅' : '❌'} ${col}`);
      });
    } else {
      console.log('\n❌ Users table does NOT exist!');
    }
    
    // Compter les enregistrements
    console.log('\n📊 Record counts:');
    try {
      const counts = await Promise.all([
        query('SELECT COUNT(*) FROM users'),
        query('SELECT COUNT(*) FROM products'),
        query('SELECT COUNT(*) FROM sales'),
        query('SELECT COUNT(*) FROM reviews'),
        query('SELECT COUNT(*) FROM newsletters'),
      ]);
      
      console.log(`   Users: ${counts[0].rows[0].count}`);
      console.log(`   Products: ${counts[1].rows[0].count}`);
      console.log(`   Sales: ${counts[2].rows[0].count}`);
      console.log(`   Reviews: ${counts[3].rows[0].count}`);
      console.log(`   Newsletters: ${counts[4].rows[0].count}`);
    } catch (err) {
      console.log('   ⚠️ Cannot count records - some tables might not exist');
    }
    
    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('   Connection string:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');
    pool.end();
    process.exit(1);
  }
};

checkDatabase();