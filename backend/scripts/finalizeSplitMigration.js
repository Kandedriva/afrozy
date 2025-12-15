const { pool } = require('../config/database');

async function finalizeSplitMigration() {
  try {
    console.log('🔄 Finalizing users table split migration...');
    
    // Begin transaction
    await pool.query('BEGIN');

    // 1. Drop old foreign key constraints
    console.log('🗑️  Dropping old foreign key constraints...');
    
    // Check which tables exist before dropping constraints
    const tableChecks = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('stores', 'orders', 'cart', 'notifications')
    `);
    
    const existingTables = tableChecks.rows.map(row => row.table_name);
    
    // Drop constraints only for existing tables
    if (existingTables.includes('stores')) {
      await pool.query(`ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_owner_id_fkey;`);
    }
    if (existingTables.includes('orders')) {
      await pool.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;`);
    }
    if (existingTables.includes('cart')) {
      await pool.query(`ALTER TABLE cart DROP CONSTRAINT IF EXISTS cart_user_id_fkey;`);
    }
    if (existingTables.includes('notifications')) {
      await pool.query(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;`);
    }

    // 2. Drop old columns and rename new ones
    console.log('🔄 Updating column structures...');
    
    // Update stores table (if exists)
    if (existingTables.includes('stores')) {
      await pool.query(`
        ALTER TABLE stores 
        DROP COLUMN IF EXISTS owner_id;
        
        ALTER TABLE stores RENAME COLUMN new_owner_id TO owner_id;
        
        ALTER TABLE stores
        ADD CONSTRAINT stores_owner_id_fkey 
          FOREIGN KEY (owner_id) REFERENCES store_owners(id) ON DELETE CASCADE;
      `);
    }

    // Update orders table (if exists)
    if (existingTables.includes('orders')) {
      await pool.query(`
        ALTER TABLE orders 
        DROP COLUMN IF EXISTS user_id;
        
        ALTER TABLE orders RENAME COLUMN new_user_id TO user_id;
        
        ALTER TABLE orders
        ADD CONSTRAINT orders_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE SET NULL;
      `);
    }

    // Update cart table (if exists)
    if (existingTables.includes('cart')) {
      await pool.query(`
        ALTER TABLE cart 
        DROP COLUMN IF EXISTS user_id;
        
        ALTER TABLE cart RENAME COLUMN new_user_id TO user_id;
        
        ALTER TABLE cart
        ADD CONSTRAINT cart_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES customers(id) ON DELETE CASCADE;
      `);
    }

    // Update notifications table (if exists)
    if (existingTables.includes('notifications')) {
      await pool.query(`
        ALTER TABLE notifications 
        DROP COLUMN IF EXISTS user_id;
        
        ALTER TABLE notifications RENAME COLUMN new_user_id TO target_user_id;
        
        -- We'll handle notifications differently since they can target any user type
        -- The user_type column will indicate which table to reference
      `);
    }

    // 3. Create backup of old users table and then drop it
    console.log('💾 Creating backup and cleaning up old users table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users_backup AS 
      SELECT * FROM users;
    `);
    
    await pool.query(`
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // 4. Create views for backward compatibility (optional)
    console.log('📋 Creating compatibility views...');
    
    await pool.query(`
      CREATE OR REPLACE VIEW all_users AS
      SELECT 
        id, username, email, full_name, phone, status, 'admin' as user_type,
        email_verified, created_at, updated_at, last_login
      FROM admins
      UNION ALL
      SELECT 
        id, username, email, full_name, phone, status, 'customer' as user_type,
        email_verified, created_at, updated_at, last_login
      FROM customers  
      UNION ALL
      SELECT 
        id, username, email, full_name, phone, status, 'store_owner' as user_type,
        email_verified, created_at, updated_at, last_login
      FROM store_owners;
    `);

    // Commit transaction
    await pool.query('COMMIT');
    
    console.log('🎉 Migration finalization completed successfully!');
    console.log('');
    console.log('✅ Summary of changes:');
    console.log('   - Old users table backed up as users_backup');
    console.log('   - Foreign keys updated to reference new tables');
    console.log('   - Created all_users view for backward compatibility');
    console.log('   - stores.owner_id now references store_owners(id)');
    console.log('   - orders.user_id now references customers(id)');
    console.log('   - cart.user_id now references customers(id)');
    console.log('   - notifications updated with user_type tracking');

  } catch (error) {
    // Rollback transaction on error
    await pool.query('ROLLBACK');
    console.error('❌ Error during migration finalization:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

module.exports = finalizeSplitMigration;

// Run this script directly if called
if (require.main === module) {
  finalizeSplitMigration()
    .then(() => {
      console.log('✅ Migration finalization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to finalize migration:', error);
      process.exit(1);
    });
}