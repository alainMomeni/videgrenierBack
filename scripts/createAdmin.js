// backend/scripts/createAdmin.js
const bcrypt = require('bcryptjs');
const { query, pool } = require('../db');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const promptInput = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

const createAdmin = async () => {
  console.log('👤 ========================================');
  console.log('👤 CREATE NEW ADMIN USER');
  console.log('👤 ========================================\n');

  try {
    const firstName = await promptInput('First Name: ');
    const lastName = await promptInput('Last Name: ');
    const email = await promptInput('Email: ');
    const password = await promptInput('Password (min 8 chars): ');

    // Validation
    if (!firstName || !lastName || !email || !password) {
      console.log('❌ All fields are required!');
      rl.close();
      pool.end();
      return;
    }

    if (password.length < 8) {
      console.log('❌ Password must be at least 8 characters!');
      rl.close();
      pool.end();
      return;
    }

    // Vérifier si l'email existe déjà
    const existingUser = await query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      console.log('\n⚠️  User with this email already exists!');
      console.log('📧 Email:', existingUser.rows[0].email);
      console.log('👤 Role:', existingUser.rows[0].role);
      
      const updateRole = await promptInput('\nDo you want to update this user to admin? (yes/no): ');
      
      if (updateRole.toLowerCase() === 'yes') {
        await query('UPDATE users SET role = $1 WHERE email = $2', ['admin', email]);
        console.log('\n✅ User role updated to admin!');
        console.log('📧 Email:', email);
      } else {
        console.log('\n❌ Operation cancelled.');
      }
      
      rl.close();
      pool.end();
      return;
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Créer l'admin (email_verified = true par défaut)
    const result = await query(
      `INSERT INTO users (
        first_name, last_name, email, password_hash, role, email_verified
      ) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, first_name, last_name, email, role, email_verified`,
      [firstName, lastName, email, hashedPassword, 'admin', true]
    );

    const newAdmin = result.rows[0];

    console.log('\n✅ ========================================');
    console.log('✅ ADMIN CREATED SUCCESSFULLY');
    console.log('✅ ========================================');
    console.log('\n👤 Admin Details:');
    console.log('   ID:', newAdmin.id);
    console.log('   Name:', newAdmin.first_name, newAdmin.last_name);
    console.log('   Email:', newAdmin.email);
    console.log('   Role:', newAdmin.role);
    console.log('   Email Verified:', newAdmin.email_verified);
    console.log('\n🔐 Login Credentials:');
    console.log('   Email:', newAdmin.email);
    console.log('   Password:', password);
    console.log('\n✅ You can now login at: http://localhost:5173/login');
    
  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
  }

  rl.close();
  pool.end();
};

createAdmin();