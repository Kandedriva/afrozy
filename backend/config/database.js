const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT || 5432,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX) || 10, // Reduced for Neon
  min: parseInt(process.env.DB_POOL_MIN) || 1,  // Reduced for Neon
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000, // Reduced timeout
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 10000,
  application_name: 'afrozy_market',
  // Neon-specific optimizations
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  query_timeout: 30000,
  statement_timeout: 30000,
  idle_in_transaction_session_timeout: 30000
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('🔗 New database connection established');
});

pool.on('remove', () => {
  console.log('🔌 Database connection removed from pool');
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL database');
    client.release();
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown function
const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Database pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
  }
};

// Query wrapper with better error handling
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, connectDB, closePool, query };