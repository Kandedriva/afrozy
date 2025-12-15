const { pool, connectDB } = require('../config/database');
require('dotenv').config();

async function createNotificationsTable() {
  try {
    await connectDB();
    
    console.log('Creating notifications table...');

    // Drop existing table if it has wrong structure
    await pool.query('DROP TABLE IF EXISTS notifications;');

    const createTableQuery = `
      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('customer', 'admin', 'store_owner')),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('order', 'promotion', 'system', 'account')),
        action_link VARCHAR(500),
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);

    // Create indexes for better performance
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_type);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);'
    ];

    for (const indexQuery of indexQueries) {
      await pool.query(indexQuery);
    }

    console.log('✅ Notifications table created successfully with indexes');

    // Check if we have any customers to create sample notifications for
    const customerResult = await pool.query('SELECT id FROM customers LIMIT 1');
    
    if (customerResult.rows.length > 0) {
      const customerId = customerResult.rows[0].id;
      
      // Insert sample notifications for testing
      const sampleNotifications = [
        {
          userId: customerId,
          userType: 'customer',
          title: 'Welcome to Afrozy Market!',
          message: 'Thank you for joining our marketplace. Explore our wide range of products and enjoy shopping!',
          type: 'account'
        },
        {
          userId: customerId,
          userType: 'customer', 
          title: 'Special Offer - Electronics',
          message: 'Get 15% off on all electronics this weekend. Use code TECH15 at checkout.',
          type: 'promotion'
        },
        {
          userId: customerId,
          userType: 'customer',
          title: 'System Maintenance',
          message: 'We will be performing scheduled maintenance on Sunday night from 12 AM to 2 AM.',
          type: 'system'
        }
      ];

      console.log('Inserting sample notifications...');
      
      for (const notification of sampleNotifications) {
        await pool.query(
          `INSERT INTO notifications (user_id, user_type, title, message, type, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, false, CURRENT_TIMESTAMP)`,
          [notification.userId, notification.userType, notification.title, notification.message, notification.type]
        );
      }

      console.log('✅ Sample notifications inserted');
    } else {
      console.log('No customers found - skipping sample notifications');
    }
    
  } catch (error) {
    console.error('❌ Error creating notifications table:', error.message);
  } finally {
    await pool.end();
  }
}

createNotificationsTable();