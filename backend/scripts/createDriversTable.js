const { pool, connectDB } = require('../config/database');
require('dotenv').config();

async function createDriversTable() {
  try {
    await connectDB();
    
    console.log('Creating drivers table and updating orders table...');

    // Create drivers table
    const createDriversTableQuery = `
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        driver_id VARCHAR(20) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        license_number VARCHAR(50) NOT NULL,
        vehicle_type VARCHAR(100) NOT NULL,
        vehicle_plate VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'inactive')),
        is_verified BOOLEAN DEFAULT false,
        rating DECIMAL(3,2) DEFAULT 5.00,
        total_deliveries INTEGER DEFAULT 0,
        current_location_lat DECIMAL(10, 8),
        current_location_lng DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createDriversTableQuery);

    // Add driver_id column to orders table if it doesn't exist
    const addDriverColumnQuery = `
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS driver_id INTEGER REFERENCES drivers(id),
      ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
    `;

    await pool.query(addDriverColumnQuery);

    // Create delivery_tracking table for detailed tracking
    const createDeliveryTrackingQuery = `
      CREATE TABLE IF NOT EXISTS delivery_tracking (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        location_lat DECIMAL(10, 8),
        location_lng DECIMAL(11, 8),
        notes TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createDeliveryTrackingQuery);

    // Update orders status enum to include delivery statuses
    const updateOrderStatusQuery = `
      ALTER TABLE orders 
      DROP CONSTRAINT IF EXISTS orders_status_check;
      
      ALTER TABLE orders 
      ADD CONSTRAINT orders_status_check 
      CHECK (status IN ('pending', 'confirmed', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'));
    `;

    await pool.query(updateOrderStatusQuery);

    // Create indexes for better performance
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);',
      'CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);',
      'CREATE INDEX IF NOT EXISTS idx_drivers_driver_id ON drivers(driver_id);',
      'CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);',
      'CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_id ON delivery_tracking(order_id);',
      'CREATE INDEX IF NOT EXISTS idx_delivery_tracking_driver_id ON delivery_tracking(driver_id);',
      'CREATE INDEX IF NOT EXISTS idx_delivery_tracking_timestamp ON delivery_tracking(timestamp DESC);'
    ];

    for (const indexQuery of indexQueries) {
      await pool.query(indexQuery);
    }

    console.log('✅ Drivers table and delivery system created successfully with indexes');

    // Insert sample driver for testing
    console.log('Creating sample driver...');
    
    try {
      const bcrypt = require('bcryptjs');
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash('driver123', saltRounds);

      await pool.query(
        `INSERT INTO drivers (driver_id, full_name, email, phone, password_hash, license_number, vehicle_type, vehicle_plate, status, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (email) DO NOTHING`,
        [
          'DRV001',
          'John Driver',
          'driver@afrozymarket.com',
          '+1-555-0123',
          passwordHash,
          'DL123456789',
          'Motorcycle',
          'DEL-001',
          'online',
          true
        ]
      );

      console.log('✅ Sample driver created successfully');
      console.log('Driver credentials:');
      console.log('Email: driver@afrozymarket.com');
      console.log('Password: driver123');
    } catch (insertError) {
      console.log(`Note: Could not insert sample driver: ${insertError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating drivers table:', error.message);
  } finally {
    await pool.end();
  }
}

createDriversTable();