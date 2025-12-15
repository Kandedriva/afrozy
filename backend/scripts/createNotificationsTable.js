const { pool, connectDB } = require('../config/database');
require('dotenv').config();

async function createNotificationsTable() {
  try {
    await connectDB();
    
    console.log('Creating notifications table...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
      'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);',
      'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);'
    ];

    for (const indexQuery of indexQueries) {
      await pool.query(indexQuery);
    }

    console.log('✅ Notifications table created successfully with indexes');

    // Insert sample notifications for testing
    const sampleNotifications = [
      {
        userId: 1, // Assuming user with ID 1 exists
        title: 'Welcome to Afrozy Market!',
        message: 'Thank you for joining our marketplace. Explore our wide range of products and enjoy shopping!',
        type: 'account'
      },
      {
        userId: 1,
        title: 'Special Offer - Electronics',
        message: 'Get 15% off on all electronics this weekend. Use code TECH15 at checkout.',
        type: 'promotion'
      },
      {
        userId: 1,
        title: 'System Maintenance',
        message: 'We will be performing scheduled maintenance on Sunday night from 12 AM to 2 AM.',
        type: 'system'
      }
    ];

    console.log('Inserting sample notifications...');
    
    for (const notification of sampleNotifications) {
      try {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
           VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)`,
          [notification.userId, notification.title, notification.message, notification.type]
        );
      } catch (insertError) {
        console.log(`Note: Could not insert sample notification (user may not exist): ${insertError.message}`);
      }
    }

    console.log('✅ Sample notifications inserted (where possible)');
    
  } catch (error) {
    console.error('❌ Error creating notifications table:', error.message);
  } finally {
    await pool.end();
  }
}

createNotificationsTable();