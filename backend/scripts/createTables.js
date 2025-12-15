const { pool } = require('../config/database');

const createTables = async () => {
  try {
    // Create products table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        image_url TEXT,
        stock_quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert sample products
    const sampleProducts = [
      {
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
        price: 89.99,
        category: 'Electronics',
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        stock_quantity: 25
      },
      {
        name: 'Organic Cotton T-Shirt',
        description: 'Comfortable and sustainable organic cotton t-shirt available in multiple colors.',
        price: 24.99,
        category: 'Clothing',
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
        stock_quantity: 50
      },
      {
        name: 'Smart Coffee Maker',
        description: 'Wi-Fi enabled coffee maker with programmable brewing and smartphone app control.',
        price: 159.99,
        category: 'Home & Kitchen',
        image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500',
        stock_quantity: 15
      },
      {
        name: 'Fitness Tracker Watch',
        description: 'Advanced fitness tracker with heart rate monitoring, GPS, and sleep tracking.',
        price: 129.99,
        category: 'Fitness',
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
        stock_quantity: 30
      },
      {
        name: 'Leather Laptop Bag',
        description: 'Premium leather laptop bag with multiple compartments for business professionals.',
        price: 79.99,
        category: 'Accessories',
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500',
        stock_quantity: 20
      },
      {
        name: 'Wireless Phone Charger',
        description: 'Fast wireless charging pad compatible with all Qi-enabled devices.',
        price: 34.99,
        category: 'Electronics',
        image_url: 'https://images.unsplash.com/photo-1558618666-c4fd7b7ca5a9?w=500',
        stock_quantity: 40
      },
      {
        name: 'Indoor Plant Pot Set',
        description: 'Set of 3 ceramic plant pots with drainage holes, perfect for indoor gardening.',
        price: 45.99,
        category: 'Home & Garden',
        image_url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500',
        stock_quantity: 35
      },
      {
        name: 'Gaming Mechanical Keyboard',
        description: 'RGB backlit mechanical keyboard with customizable keys for gaming enthusiasts.',
        price: 119.99,
        category: 'Electronics',
        image_url: 'https://images.unsplash.com/photo-1595044426077-d36d9236d54a?w=500',
        stock_quantity: 18
      }
    ];

    // Check if products already exist
    const existingProducts = await pool.query('SELECT COUNT(*) FROM products');
    
    if (existingProducts.rows[0].count === '0') {
      for (const product of sampleProducts) {
        await pool.query(`
          INSERT INTO products (name, description, price, category, image_url, stock_quantity)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [product.name, product.description, product.price, product.category, product.image_url, product.stock_quantity]);
      }
      console.log('✅ Sample products inserted successfully');
    } else {
      console.log('✅ Products table already contains data');
    }

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
};

module.exports = createTables;