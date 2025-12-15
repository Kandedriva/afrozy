const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
require('dotenv').config();

async function createAdminUser() {
  try {
    // Admin user details - get password from environment or use default for development
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@afrozymarket.com';
    
    const adminData = {
      username: 'admin',
      email: adminEmail,
      password: adminPassword,
      fullName: 'Admin User',
      phone: null,
      address: null,
      userType: 'admin'
    };

    // Warn if using default credentials
    if (adminPassword === 'admin123') {
      console.log('⚠️  WARNING: Using default admin password!');
      console.log('   Set ADMIN_PASSWORD environment variable for production use.');
      console.log('   Example: ADMIN_PASSWORD="your_secure_password" node scripts/createAdminUser.js\n');
    }

    console.log('Creating admin user...');

    // Check if admin user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [adminData.email, adminData.username]
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ Admin user already exists!');
      console.log('Existing user details:', existingUser.rows[0]);
      return;
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminData.password, saltRounds);

    // Insert admin user
    const insertQuery = `
      INSERT INTO users (username, email, password_hash, full_name, phone, address, user_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING id, username, email, full_name, user_type, created_at
    `;

    const result = await pool.query(insertQuery, [
      adminData.username,
      adminData.email,
      passwordHash,
      adminData.fullName,
      adminData.phone,
      adminData.address,
      adminData.userType
    ]);

    console.log('✅ Admin user created successfully!');
    console.log('Admin details:', {
      id: result.rows[0].id,
      username: result.rows[0].username,
      email: result.rows[0].email,
      fullName: result.rows[0].full_name,
      userType: result.rows[0].user_type,
      createdAt: result.rows[0].created_at
    });

    console.log('\n📧 Admin Login Credentials:');
    console.log(`Email: ${adminData.email}`);
    if (adminPassword === 'admin123') {
      console.log('Password: admin123 (default)');
      console.log('\n🔒 IMPORTANT: Change the default password after first login!');
    } else {
      console.log('Password: [Set via ADMIN_PASSWORD environment variable]');
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the script
createAdminUser();