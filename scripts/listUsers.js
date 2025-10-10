// backend/scripts/listUsers.js
const { query, pool } = require('../db');

const listUsers = async () => {
  try {
    console.log('📋 Fetching all users from database...\n');
    
    const result = await query(`
      SELECT 
        id, 
        first_name, 
        last_name, 
        email, 
        role, 
        email_verified,
        is_blocked,
        created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log(`✅ Found ${result.rows.length} users:\n`);
    
    if (result.rows.length === 0) {
      console.log('   No users found in database\n');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Email Verified: ${user.email_verified ? '✅' : '❌'}`);
        console.log(`   Blocked: ${user.is_blocked ? '⚠️ YES' : '✅ No'}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log('');
      });
    }
    
    // Statistiques
    const stats = await query(`
      SELECT 
        role::text,
        COUNT(*) as count,
        SUM(CASE WHEN email_verified = true THEN 1 ELSE 0 END) as verified,
        SUM(CASE WHEN is_blocked = true THEN 1 ELSE 0 END) as blocked
      FROM users
      GROUP BY role
      ORDER BY role
    `);
    
    if (stats.rows.length > 0) {
      console.log('📊 Statistics by role:');
      stats.rows.forEach(stat => {
        console.log(`   ${stat.role}: ${stat.count} users (${stat.verified} verified, ${stat.blocked} blocked)`);
      });
      console.log('');
    }
    
    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
};

listUsers();