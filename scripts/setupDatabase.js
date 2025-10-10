// backend/scripts/setupDatabase.js
const { query, pool } = require('../db');

const setupDatabase = async () => {
  try {
    console.log('🚀 Setting up Vide Grenier Kamer database schema...\n');
    
    // 1. Créer les ENUMs
    console.log('📝 Creating ENUMs...');
    
    await query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await query(`
      DO $$ BEGIN
        CREATE TYPE supply_status AS ENUM ('pending', 'delivered', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await query(`
      DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM ('card', 'paypal', 'mobile_money');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await query(`
      DO $$ BEGIN
        CREATE TYPE sale_status AS ENUM ('completed', 'pending', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await query(`
      DO $$ BEGIN
        CREATE TYPE review_status AS ENUM ('approved', 'pending', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    console.log('✅ ENUMs created\n');
    
    // 2. Créer la table users
    console.log('📝 Creating users table...');
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role user_role NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_token_expires TIMESTAMP WITH TIME ZONE,
        is_blocked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table created\n');
    
    // 3. Créer la table products
    console.log('📝 Creating products table...');
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id_produit SERIAL PRIMARY KEY,
        id_user INTEGER REFERENCES users(id) ON DELETE CASCADE,
        nom_produit VARCHAR(255) NOT NULL,
        nom_createur VARCHAR(100),
        categorie VARCHAR(50) NOT NULL,
        prix DECIMAL(10, 2) NOT NULL,
        quantite INTEGER NOT NULL DEFAULT 0,
        photo TEXT,
        description TEXT,
        date_creation TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Products table created\n');
    
    // 4. Créer la table stock_records
    console.log('📝 Creating stock_records table...');
    await query(`
      CREATE TABLE IF NOT EXISTS stock_records (
        id_stock SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        id_produit INTEGER REFERENCES products(id_produit) ON DELETE CASCADE,
        quantite_ouverture_mois INTEGER DEFAULT 0,
        quantite_vendu_mois INTEGER DEFAULT 0,
        stock_actuel INTEGER DEFAULT 0,
        quantite_approvisionner INTEGER DEFAULT 0,
        valeur_stock DECIMAL(10, 2) DEFAULT 0,
        prix_unitaire DECIMAL(10, 2)
      )
    `);
    console.log('✅ Stock_records table created\n');
    
    // 5. Créer la table suppliers
    console.log('📝 Creating suppliers table...');
    await query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id_fournisseur SERIAL PRIMARY KEY,
        nom_fournisseur VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        telephone VARCHAR(20),
        adresse TEXT
      )
    `);
    console.log('✅ Suppliers table created\n');
    
    // 6. Créer la table supplies
    console.log('📝 Creating supplies table...');
    await query(`
      CREATE TABLE IF NOT EXISTS supplies (
        id_supply SERIAL PRIMARY KEY,
        id_produit INTEGER REFERENCES products(id_produit) ON DELETE CASCADE,
        id_fournisseur INTEGER REFERENCES suppliers(id_fournisseur),
        id_user INTEGER REFERENCES users(id),
        quantite INTEGER NOT NULL,
        prix_unitaire DECIMAL(10, 2) NOT NULL,
        prix_total DECIMAL(10, 2) NOT NULL,
        date_approvisionnement DATE NOT NULL,
        statut supply_status DEFAULT 'pending',
        notes TEXT
      )
    `);
    console.log('✅ Supplies table created\n');
    
    // 7. Créer la table sales
    console.log('📝 Creating sales table...');
    await query(`
      CREATE TABLE IF NOT EXISTS sales (
        id_sale SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        id_produit INTEGER REFERENCES products(id_produit),
        id_seller INTEGER REFERENCES users(id),
        buyer_name VARCHAR(100) NOT NULL,
        buyer_email VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status sale_status DEFAULT 'pending',
        payment_method payment_method NOT NULL
      )
    `);
    console.log('✅ Sales table created\n');
    
    // 8. Créer la table reviews
    console.log('📝 Creating reviews table...');
    await query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id_review SERIAL PRIMARY KEY,
        id_produit INTEGER REFERENCES products(id_produit) ON DELETE CASCADE,
        customer_name VARCHAR(100) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        review_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status review_status DEFAULT 'pending',
        helpful INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT FALSE
      )
    `);
    console.log('✅ Reviews table created\n');
    
    // 9. Créer la table cart_items
    console.log('📝 Creating cart_items table...');
    await query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id_cart SERIAL PRIMARY KEY,
        id_user INTEGER REFERENCES users(id) ON DELETE CASCADE,
        id_produit INTEGER REFERENCES products(id_produit) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(id_user, id_produit)
      )
    `);
    console.log('✅ Cart_items table created\n');
    
    // 10. Créer la table newsletters
    console.log('📝 Creating newsletters table...');
    await query(`
      CREATE TABLE IF NOT EXISTS newsletters (
        id_newsletter SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    
    // Créer l'index pour newsletters
    await query(`
      CREATE INDEX IF NOT EXISTS idx_newsletters_email ON newsletters(email)
    `);
    console.log('✅ Newsletters table created\n');
    
    // Vérification finale
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('✅ Database setup completed!\n');
    console.log(`📋 Total tables: ${tables.rows.length}`);
    tables.rows.forEach(table => {
      console.log(`   ✓ ${table.table_name}`);
    });
    
    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error('   Details:', error);
    pool.end();
    process.exit(1);
  }
};

setupDatabase();