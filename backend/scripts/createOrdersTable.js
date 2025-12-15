const { pool, connectDB } = require('../config/database');
require('dotenv').config();

async function createOrdersTable() {
  try {
    
    console.log('Creating orders and order_items tables...');

    // Create orders table
    const createOrdersTableQuery = `
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        order_number VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled')),
        total DECIMAL(10, 2) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        shipping_address TEXT NOT NULL,
        order_notes TEXT,
        payment_method VARCHAR(100) DEFAULT 'cash_on_delivery',
        estimated_delivery TIMESTAMP,
        tracking_number VARCHAR(100),
        driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
        assigned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createOrdersTableQuery);

    // Create order_items table
    const createOrderItemsTableQuery = `
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        price DECIMAL(10, 2) NOT NULL,
        price_per_item DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createOrderItemsTableQuery);

    // Ensure price_per_item column exists (for compatibility with existing tables)
    try {
      await pool.query(`
        ALTER TABLE order_items 
        ADD COLUMN IF NOT EXISTS price_per_item DECIMAL(10, 2)
      `);
      
      // Update existing rows where price_per_item is null
      await pool.query(`
        UPDATE order_items 
        SET price_per_item = price 
        WHERE price_per_item IS NULL
      `);
      
      console.log('✅ order_items table updated with price_per_item column');
    } catch (alterError) {
      console.log('Note: price_per_item column already exists or could not be added');
    }

    // Create indexes for better performance
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);',
      'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);',
      'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);',
      'CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);'
    ];

    for (const indexQuery of indexQueries) {
      await pool.query(indexQuery);
    }

    console.log('✅ Orders and order_items tables created successfully with indexes');

    // Insert sample orders for testing
    console.log('Inserting sample orders...');
    
    try {
      // Check if user with ID 1 exists
      const userCheck = await pool.query('SELECT id FROM users WHERE id = 1');
      
      if (userCheck.rows.length > 0) {
        // Create sample order
        const orderResult = await pool.query(
          `INSERT INTO orders (user_id, order_number, status, total, shipping_address, payment_method, estimated_delivery, tracking_number, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            1,
            'JM2024000',
            'delivered',
            24.99,
            '123 Main St, City, State 12345',
            'PayPal',
            new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            'TRK987654321',
            new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // 6 days ago
          ]
        );

        const orderId = orderResult.rows[0].id;

        // Check if any products exist
        const productCheck = await pool.query('SELECT id, price FROM products LIMIT 1');
        
        if (productCheck.rows.length > 0) {
          const product = productCheck.rows[0];
          
          // Create sample order item
          await pool.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price)
             VALUES ($1, $2, $3, $4)`,
            [orderId, product.id, 1, product.price]
          );

          console.log('✅ Sample order and order item inserted successfully');
        } else {
          console.log('Note: No products found, skipping sample order items');
        }
      } else {
        console.log('Note: No users found, skipping sample orders');
      }
    } catch (insertError) {
      console.log(`Note: Could not insert sample orders: ${insertError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating orders tables:', error.message);
  }
}

module.exports = createOrdersTable;