#!/usr/bin/env node

/**
 * Database Migration: Create Refunds Table
 * Adds comprehensive refund tracking for orders
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
  port: process.env.PGPORT || 5432,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
});

async function createRefundsTable() {
  const client = await pool.connect();

  try {
    console.log('🔄 Creating refunds table...');

    await client.query('BEGIN');

    // Create refunds table
    await client.query(`
      CREATE TABLE IF NOT EXISTS refunds (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES customers(id),
        refund_amount DECIMAL(10, 2) NOT NULL,
        refund_reason TEXT,
        refund_type VARCHAR(20) NOT NULL DEFAULT 'full', -- 'full' or 'partial'
        status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
        stripe_refund_id VARCHAR(255), -- Stripe refund ID
        stripe_payment_intent_id VARCHAR(255), -- Original payment intent
        requested_by VARCHAR(20) NOT NULL, -- 'customer', 'admin', 'system'
        requested_by_id INTEGER, -- ID of user/admin who requested
        processed_by_id INTEGER, -- ID of admin who processed
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Refunds table created');

    // Create refund_items table for partial refunds
    await client.query(`
      CREATE TABLE IF NOT EXISTS refund_items (
        id SERIAL PRIMARY KEY,
        refund_id INTEGER NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        refund_amount DECIMAL(10, 2) NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Refund items table created');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
      CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
      CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
      CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at);
      CREATE INDEX IF NOT EXISTS idx_refund_items_refund_id ON refund_items(refund_id);
    `);

    console.log('✅ Indexes created');

    // Add refund_id column to orders table if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'orders' AND column_name = 'refund_status'
        ) THEN
          ALTER TABLE orders ADD COLUMN refund_status VARCHAR(20) DEFAULT 'none';
        END IF;
      END $$;
    `);

    console.log('✅ Added refund_status column to orders table');

    await client.query('COMMIT');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nTables created:');
    console.log('  - refunds (main refund tracking table)');
    console.log('  - refund_items (for partial refund details)');
    console.log('\nColumns added to orders:');
    console.log('  - refund_status (tracks if order has refund)');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
createRefundsTable();
