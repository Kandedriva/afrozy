const { pool } = require('../config/database');

const addStripeConnectToStores = async () => {
  try {
    console.log('Adding Stripe Connect fields to stores table...');
    
    // Add Stripe Connect account fields to stores table
    await pool.query(`
      ALTER TABLE stores 
      ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS stripe_account_status VARCHAR(50) DEFAULT 'not_connected' 
        CHECK (stripe_account_status IN ('not_connected', 'pending', 'connected', 'restricted', 'disabled')),
      ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS stripe_onboarding_url TEXT,
      ADD COLUMN IF NOT EXISTS stripe_connected_at TIMESTAMP
    `);

    // Create index for Stripe Connect account ID
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_stores_stripe_account_id ON stores(stripe_connect_account_id);
      CREATE INDEX IF NOT EXISTS idx_stores_stripe_status ON stores(stripe_account_status);
    `);

    console.log('✅ Stripe Connect fields added to stores table successfully');

  } catch (error) {
    console.error('❌ Error adding Stripe Connect fields to stores table:', error.message);
    throw error;
  }
};

module.exports = addStripeConnectToStores;