const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function splitUsersTable() {
  try {
    console.log('🔄 Starting users table split migration...');
    
    // Begin transaction
    await pool.query('BEGIN');
    
    // 1. Create admins table
    console.log('📋 Creating admins table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        email_verified BOOLEAN DEFAULT false,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        permissions JSONB DEFAULT '["all"]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);

    // 2. Create customers table
    console.log('📋 Creating customers table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        email_verified BOOLEAN DEFAULT false,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        date_of_birth DATE,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);

    // 3. Create store_owners table
    console.log('📋 Creating store_owners table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_owners (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        email_verified BOOLEAN DEFAULT false,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        business_name VARCHAR(255),
        tax_id VARCHAR(50),
        business_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);

    // 4. Create indexes for better performance
    console.log('📋 Creating indexes...');
    await pool.query(`
      -- Admins indexes
      CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
      CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
      CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);
      
      -- Customers indexes  
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
      CREATE INDEX IF NOT EXISTS idx_customers_username ON customers(username);
      CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
      
      -- Store owners indexes
      CREATE INDEX IF NOT EXISTS idx_store_owners_email ON store_owners(email);
      CREATE INDEX IF NOT EXISTS idx_store_owners_username ON store_owners(username);
      CREATE INDEX IF NOT EXISTS idx_store_owners_status ON store_owners(status);
    `);

    // 5. Migrate existing data
    console.log('🔄 Migrating existing user data...');
    
    // Migrate admins
    const adminResult = await pool.query(`
      INSERT INTO admins (username, email, password_hash, full_name, phone, status, email_verified, reset_token, reset_token_expires, created_at, updated_at, last_login)
      SELECT username, email, password_hash, full_name, phone, status, email_verified, reset_token, reset_token_expires, created_at, updated_at, last_login
      FROM users 
      WHERE user_type = 'admin'
    `);
    console.log(`✅ Migrated ${adminResult.rowCount} admin(s)`);

    // Migrate customers
    const customerResult = await pool.query(`
      INSERT INTO customers (username, email, password_hash, full_name, phone, address, status, email_verified, reset_token, reset_token_expires, created_at, updated_at, last_login)
      SELECT username, email, password_hash, full_name, phone, address, status, email_verified, reset_token, reset_token_expires, created_at, updated_at, last_login
      FROM users 
      WHERE user_type = 'customer'
    `);
    console.log(`✅ Migrated ${customerResult.rowCount} customer(s)`);

    // Migrate store owners
    const storeOwnerResult = await pool.query(`
      INSERT INTO store_owners (username, email, password_hash, full_name, phone, address, status, email_verified, reset_token, reset_token_expires, created_at, updated_at, last_login)
      SELECT username, email, password_hash, full_name, phone, address, status, email_verified, reset_token, reset_token_expires, created_at, updated_at, last_login
      FROM users 
      WHERE user_type = 'store_owner'
    `);
    console.log(`✅ Migrated ${storeOwnerResult.rowCount} store owner(s)`);

    // 6. Update foreign key relationships
    console.log('🔗 Updating foreign key relationships...');
    
    // Create mapping tables to track ID relationships
    await pool.query(`
      CREATE TEMP TABLE user_id_mapping AS
      SELECT 
        u.id as old_id,
        'customer' as user_type,
        c.id as new_id
      FROM users u
      JOIN customers c ON u.email = c.email
      WHERE u.user_type = 'customer'
      
      UNION ALL
      
      SELECT 
        u.id as old_id,
        'admin' as user_type,
        a.id as new_id
      FROM users u
      JOIN admins a ON u.email = a.email
      WHERE u.user_type = 'admin'
      
      UNION ALL
      
      SELECT 
        u.id as old_id,
        'store_owner' as user_type,
        so.id as new_id
      FROM users u
      JOIN store_owners so ON u.email = so.email
      WHERE u.user_type = 'store_owner';
    `);

    // Update stores table to reference store_owners
    await pool.query(`
      ALTER TABLE stores 
      ADD COLUMN IF NOT EXISTS new_owner_id INTEGER;
    `);
    
    await pool.query(`
      UPDATE stores 
      SET new_owner_id = m.new_id
      FROM user_id_mapping m
      WHERE stores.owner_id = m.old_id AND m.user_type = 'store_owner';
    `);

    // Update orders table to reference customers  
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS new_user_id INTEGER;
    `);
    
    await pool.query(`
      UPDATE orders 
      SET new_user_id = m.new_id
      FROM user_id_mapping m
      WHERE orders.user_id = m.old_id AND m.user_type = 'customer';
    `);

    // Update cart table to reference customers (if it exists)
    const cartExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'cart'
      );
    `);
    
    if (cartExists.rows[0].exists) {
      await pool.query(`
        ALTER TABLE cart 
        ADD COLUMN IF NOT EXISTS new_user_id INTEGER;
      `);
      
      await pool.query(`
        UPDATE cart 
        SET new_user_id = m.new_id
        FROM user_id_mapping m
        WHERE cart.user_id = m.old_id AND m.user_type = 'customer';
      `);
    } else {
      console.log('ℹ️  Cart table does not exist, skipping cart migration');
    }

    // Update notifications table to reference appropriate user types (if it exists)
    const notificationsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'notifications'
      );
    `);
    
    if (notificationsExists.rows[0].exists) {
      await pool.query(`
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS new_user_id INTEGER,
        ADD COLUMN IF NOT EXISTS user_type VARCHAR(20);
      `);
      
      await pool.query(`
        UPDATE notifications 
        SET new_user_id = m.new_id, user_type = m.user_type
        FROM user_id_mapping m
        WHERE notifications.user_id = m.old_id;
      `);
    } else {
      console.log('ℹ️  Notifications table does not exist, skipping notifications migration');
    }

    console.log('✅ Foreign key relationships updated with new IDs');

    // Commit transaction
    await pool.query('COMMIT');
    
    console.log('🎉 Users table split migration completed successfully!');
    console.log('📊 Migration Summary:');
    console.log(`   - Admins: ${adminResult.rowCount}`);
    console.log(`   - Customers: ${customerResult.rowCount}`);
    console.log(`   - Store Owners: ${storeOwnerResult.rowCount}`);
    console.log('');
    console.log('⚠️  NEXT STEPS:');
    console.log('   1. Test the new table structure');
    console.log('   2. Update application code to use new tables');
    console.log('   3. Drop old foreign key constraints');
    console.log('   4. Rename new columns to replace old ones');
    console.log('   5. Drop the old users table');

  } catch (error) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('❌ Error during users table split migration:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

module.exports = splitUsersTable;

// Run this script directly if called
if (require.main === module) {
  splitUsersTable()
    .then(() => {
      console.log('✅ Users table split migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to split users table:', error);
      process.exit(1);
    });
}