const { pool } = require('../config/database');

async function updateOrdersTableForCheckout() {
  try {
    console.log('Updating orders table for checkout functionality...');

    // Add missing columns to orders table
    const alterQueriesRaw = [
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id VARCHAR(255)',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255)',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2)',
      
      // Update existing columns to make them nullable for checkout compatibility
      'ALTER TABLE orders ALTER COLUMN order_number DROP NOT NULL',
      'ALTER TABLE orders ALTER COLUMN customer_name DROP NOT NULL',
      'ALTER TABLE orders ALTER COLUMN customer_email DROP NOT NULL', 
      'ALTER TABLE orders ALTER COLUMN customer_phone DROP NOT NULL',
      'ALTER TABLE orders ALTER COLUMN shipping_address DROP NOT NULL'
    ];

    // Execute each query separately to handle potential errors gracefully
    for (const query of alterQueriesRaw) {
      try {
        await pool.query(query);
        console.log(`✅ Executed: ${query}`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`⚠️ Skipped: ${query} - ${error.message}`);
        } else {
          console.error(`❌ Error executing: ${query} - ${error.message}`);
        }
      }
    }

    // Create indexes for new columns
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON orders(payment_intent_id)'
    ];

    for (const indexQuery of indexQueries) {
      try {
        await pool.query(indexQuery);
        console.log(`✅ Created index: ${indexQuery}`);
      } catch (error) {
        console.log(`⚠️ Index may already exist: ${error.message}`);
      }
    }

    console.log('✅ Orders table updated successfully for checkout functionality');

  } catch (error) {
    console.error('❌ Error updating orders table:', error.message);
    throw error;
  }
}

module.exports = updateOrdersTableForCheckout;

// Run this script directly if called
if (require.main === module) {
  updateOrdersTableForCheckout()
    .then(() => {
      console.log('Orders table update completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to update orders table:', error);
      process.exit(1);
    });
}