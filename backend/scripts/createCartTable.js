const { pool } = require('../config/database');

async function createCartTable() {
  try {
    console.log('Creating cart table...');
    
    const createCartTableQuery = `
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255), -- For guest users
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id), -- Prevent duplicate items for same user
        UNIQUE(session_id, product_id) -- Prevent duplicate items for same session
      );
    `;

    await pool.query(createCartTableQuery);
    console.log('✅ Cart table created successfully');

    // Create indexes for better performance
    const createIndexesQuery = `
      CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_cart_session_id ON cart_items(session_id);
      CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_cart_added_at ON cart_items(added_at);
    `;

    await pool.query(createIndexesQuery);
    console.log('✅ Cart table indexes created successfully');

    // Create trigger to update updated_at timestamp
    const createTriggerQuery = `
      CREATE OR REPLACE FUNCTION update_cart_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_cart_updated_at ON cart_items;
      CREATE TRIGGER update_cart_updated_at
        BEFORE UPDATE ON cart_items
        FOR EACH ROW
        EXECUTE FUNCTION update_cart_updated_at();
    `;

    await pool.query(createTriggerQuery);
    console.log('✅ Cart table trigger created successfully');

  } catch (error) {
    console.error('❌ Error creating cart table:', error.message);
    throw error;
  }
}

module.exports = createCartTable;

// Run this script directly if called
if (require.main === module) {
  createCartTable()
    .then(() => {
      console.log('Cart table setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to create cart table:', error);
      process.exit(1);
    });
}