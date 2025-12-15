const { pool } = require('../config/database');

async function addDeliveryFieldsToOrders() {
  try {
    console.log('Adding delivery fields to orders table...');

    // Add delivery information columns to orders table
    const alterQueries = [
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_name VARCHAR(255)',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_email VARCHAR(255)',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_phone VARCHAR(50)',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(255)',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_state VARCHAR(255)',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zip VARCHAR(20)',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_country VARCHAR(255)',
      'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_instructions TEXT'
    ];

    // Execute each query separately to handle potential errors gracefully
    for (const query of alterQueries) {
      try {
        await pool.query(query);
        console.log(`✅ Executed: ${query}`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
          console.log(`⚠️ Skipped: ${query} - Column already exists`);
        } else {
          console.error(`❌ Error executing: ${query} - ${error.message}`);
          throw error;
        }
      }
    }

    // Create indexes for commonly queried delivery fields
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_orders_delivery_email ON orders(delivery_email)',
      'CREATE INDEX IF NOT EXISTS idx_orders_delivery_city ON orders(delivery_city)',
      'CREATE INDEX IF NOT EXISTS idx_orders_delivery_state ON orders(delivery_state)',
      'CREATE INDEX IF NOT EXISTS idx_orders_delivery_zip ON orders(delivery_zip)'
    ];

    for (const indexQuery of indexQueries) {
      try {
        await pool.query(indexQuery);
        console.log(`✅ Created index: ${indexQuery}`);
      } catch (error) {
        console.log(`⚠️ Index may already exist: ${error.message}`);
      }
    }

    console.log('✅ Delivery fields added to orders table successfully');

  } catch (error) {
    console.error('❌ Error adding delivery fields to orders table:', error.message);
    throw error;
  }
}

module.exports = addDeliveryFieldsToOrders;

// Run this script directly if called
if (require.main === module) {
  addDeliveryFieldsToOrders()
    .then(() => {
      console.log('Delivery fields migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to add delivery fields:', error);
      process.exit(1);
    });
}