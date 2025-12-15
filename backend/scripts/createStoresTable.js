const { pool } = require('../config/database');

const createStoresTable = async () => {
  try {
    console.log('Creating stores table...');
    
    // Create stores table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        store_name VARCHAR(255) NOT NULL,
        store_description TEXT,
        store_address TEXT,
        business_type VARCHAR(100),
        business_license VARCHAR(255),
        categories JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);
      CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
      CREATE INDEX IF NOT EXISTS idx_stores_categories ON stores USING GIN(categories);
    `);

    // Update products table to include store_id
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE
    `);

    // Create index for products.store_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
    `);

    // Update trigger for stores updated_at
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_stores_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
      CREATE TRIGGER update_stores_updated_at 
        BEFORE UPDATE ON stores 
        FOR EACH ROW 
        EXECUTE FUNCTION update_stores_updated_at_column();
    `);

    // Add store_owner user type to users table if not exists
    await pool.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_user_type_check;
      
      ALTER TABLE users 
      ADD CONSTRAINT users_user_type_check 
      CHECK (user_type IN ('customer', 'admin', 'store_owner'));
    `);

    console.log('✅ Stores table created successfully');
    console.log('✅ Stores table indexes created successfully');
    console.log('✅ Products table updated with store_id');
    console.log('✅ Stores table trigger created successfully');
    console.log('✅ User types updated to include store_owner');

  } catch (error) {
    console.error('❌ Error creating stores table:', error.message);
    throw error;
  }
};

module.exports = createStoresTable;