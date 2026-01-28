#!/usr/bin/env node

/**
 * Database Migration: Add Store Owner Support to Refunds
 * Adds store_owner_id column to track which store owner should process the refund
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
  port: process.env.PGPORT || 5432,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
});

async function addStoreOwnerToRefunds() {
  const client = await pool.connect();

  try {
    console.log('🔄 Adding store owner support to refunds table...');

    await client.query('BEGIN');

    // Add store_owner_id column to refunds table
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'refunds' AND column_name = 'store_owner_id'
        ) THEN
          ALTER TABLE refunds ADD COLUMN store_owner_id INTEGER REFERENCES store_owners(id);
        END IF;
      END $$;
    `);

    console.log('✅ Added store_owner_id column to refunds table');

    // Create index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refunds_store_owner_id ON refunds(store_owner_id);
    `);

    console.log('✅ Index created for store_owner_id');

    await client.query('COMMIT');

    console.log('\n✅ Migration completed successfully!');
    console.log('\nColumns added to refunds:');
    console.log('  - store_owner_id (references store_owners for store product refunds)');

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
addStoreOwnerToRefunds();
