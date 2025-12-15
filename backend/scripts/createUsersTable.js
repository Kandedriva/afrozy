const { pool } = require('../config/database');

async function createUsersTable() {
  try {
    console.log('Creating users table...');
    
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        user_type VARCHAR(20) DEFAULT 'customer' CHECK (user_type IN ('customer', 'admin')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        email_verified BOOLEAN DEFAULT false,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `;

    await pool.query(createUsersTableQuery);
    console.log('✅ Users table created successfully');

    // Create indexes for better performance
    const createIndexesQuery = `
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
      CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
    `;

    await pool.query(createIndexesQuery);
    console.log('✅ User table indexes created successfully');

    // Create default admin user if it doesn't exist
    const createAdminQuery = `
      INSERT INTO users (username, email, password_hash, full_name, user_type, status, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
      RETURNING id;
    `;

    // Default admin password: 'admin123' (hashed with bcrypt)
    const bcrypt = require('bcryptjs');
    const defaultAdminPassword = await bcrypt.hash('admin123', 10);

    const adminResult = await pool.query(createAdminQuery, [
      'admin',
      'admin@afrozymarket.com',
      defaultAdminPassword,
      'Admin User',
      'admin',
      'active',
      true
    ]);

    if (adminResult.rows.length > 0) {
      console.log('✅ Default admin user created successfully');
      console.log('📧 Admin credentials: admin@afrozymarket.com / admin123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

  } catch (error) {
    console.error('❌ Error creating users table:', error.message);
    throw error;
  }
}

module.exports = createUsersTable;

// Run this script directly if called
if (require.main === module) {
  createUsersTable()
    .then(() => {
      console.log('Users table setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to create users table:', error);
      process.exit(1);
    });
}