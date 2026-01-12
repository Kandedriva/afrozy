const { pool } = require('../config/database');
const logger = require('../config/logger');

async function createFailedTransfersTable() {
  try {
    logger.info('Creating failed_transfers table...');

    // Create failed_transfers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS failed_transfers (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        store_id INTEGER NOT NULL,
        store_name VARCHAR(255) NOT NULL,
        amount_cents INTEGER NOT NULL,
        stripe_account_id VARCHAR(255) NOT NULL,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    logger.info('✅ Failed transfers table created successfully');

    // Create indexes for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_transfers_order_id
      ON failed_transfers(order_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_transfers_store_id
      ON failed_transfers(store_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_transfers_resolved
      ON failed_transfers(resolved)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_failed_transfers_created_at
      ON failed_transfers(created_at DESC)
    `);

    logger.info('✅ Failed transfers indexes created successfully');

    // Add notes column to orders table if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS notes TEXT
      `);
      logger.info('✅ Added notes column to orders table');
    } catch (error) {
      logger.warn('⚠️  Notes column may already exist in orders table');
    }

    logger.info('✅ Failed transfers table setup completed');

  } catch (error) {
    logger.error('Error creating failed_transfers table:', error);
    throw error;
  }
}

module.exports = createFailedTransfersTable;

// Run if called directly
if (require.main === module) {
  createFailedTransfersTable()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}
