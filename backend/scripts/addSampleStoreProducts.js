const { pool } = require('../config/database');

const addSampleStoreProducts = async () => {
  try {
    console.log('Adding sample store products...');

    // First, let's get the existing stores to assign products to them
    const storesResult = await pool.query('SELECT id, store_name FROM stores LIMIT 3');
    const stores = storesResult.rows;

    if (stores.length === 0) {
      console.log('No stores found. Please create some stores first.');
      return;
    }

    // Sample products for each store
    const storeProducts = [
      // Store 1 Products
      {
        store_id: stores[0]?.id,
        products: [
          {
            name: 'Fresh Organic Bananas',
            description: 'Sweet and ripe organic bananas, perfect for breakfast or snacks. Grown locally with sustainable farming practices.',
            price: 2.99,
            category: 'Fruits',
            image_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500',
            stock_quantity: 50
          },
          {
            name: 'Artisan Whole Grain Bread',
            description: 'Freshly baked whole grain bread made with organic flour and natural ingredients. Perfect for sandwiches or toast.',
            price: 4.50,
            category: 'Bakery',
            image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500',
            stock_quantity: 20
          },
          {
            name: 'Free-Range Organic Eggs',
            description: 'Farm-fresh eggs from happy, free-range chickens. High in protein and perfect for any meal.',
            price: 5.99,
            category: 'Dairy & Eggs',
            image_url: 'https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?w=500',
            stock_quantity: 30
          },
          {
            name: 'Local Honey',
            description: 'Pure, raw honey from local beekeepers. Natural sweetener with amazing health benefits.',
            price: 8.99,
            category: 'Natural Products',
            image_url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=500',
            stock_quantity: 25
          }
        ]
      },
      // Store 2 Products  
      {
        store_id: stores[1]?.id,
        products: [
          {
            name: 'Handcrafted Ceramic Mug',
            description: 'Beautiful handmade ceramic mug, perfect for your morning coffee or tea. Each piece is unique.',
            price: 15.99,
            category: 'Home & Kitchen',
            image_url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93d?w=500',
            stock_quantity: 12
          },
          {
            name: 'Vintage-Style Wall Clock',
            description: 'Elegant vintage-style wall clock that adds character to any room. Silent quartz movement.',
            price: 29.99,
            category: 'Home Decor',
            image_url: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=500',
            stock_quantity: 8
          },
          {
            name: 'Bamboo Cutting Board Set',
            description: 'Eco-friendly bamboo cutting board set with 3 different sizes. Antibacterial and durable.',
            price: 22.50,
            category: 'Kitchen Accessories',
            image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500',
            stock_quantity: 15
          },
          {
            name: 'Scented Soy Candles',
            description: 'Hand-poured soy candles with natural essential oils. Available in lavender, vanilla, and eucalyptus scents.',
            price: 12.99,
            category: 'Home Fragrance',
            image_url: 'https://images.unsplash.com/photo-1602623421740-69e99c9e4b1f?w=500',
            stock_quantity: 40
          }
        ]
      },
      // Store 3 Products
      {
        store_id: stores[2]?.id,
        products: [
          {
            name: 'Wireless Bluetooth Earbuds',
            description: 'High-quality wireless earbuds with noise cancellation and 24-hour battery life. Perfect for music and calls.',
            price: 79.99,
            category: 'Electronics',
            image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500',
            stock_quantity: 25
          },
          {
            name: 'Smartphone Stand',
            description: 'Adjustable aluminum smartphone stand for desk or bedside. Compatible with all phone sizes.',
            price: 19.99,
            category: 'Phone Accessories',
            image_url: 'https://images.unsplash.com/photo-1558618666-c4fd7b7ca5a9?w=500',
            stock_quantity: 35
          },
          {
            name: 'USB-C Fast Charger',
            description: 'Fast charging USB-C adapter with multiple safety protections. Charges phones and tablets quickly.',
            price: 24.99,
            category: 'Electronics',
            image_url: 'https://images.unsplash.com/photo-1603904796081-bb539bb8cc22?w=500',
            stock_quantity: 50
          },
          {
            name: 'Portable Power Bank',
            description: '10000mAh portable power bank with dual USB ports. Compact design for travel and daily use.',
            price: 34.99,
            category: 'Electronics',
            image_url: 'https://images.unsplash.com/photo-1609592802174-e5ba0f7c0ec4?w=500',
            stock_quantity: 20
          }
        ]
      }
    ];

    let totalProductsAdded = 0;

    for (const storeData of storeProducts) {
      if (!storeData.store_id) continue;

      console.log(`Adding products for store ID: ${storeData.store_id}`);
      
      for (const product of storeData.products) {
        // Check if product already exists
        const existingProduct = await pool.query(
          'SELECT id FROM products WHERE name = $1 AND store_id = $2',
          [product.name, storeData.store_id]
        );

        if (existingProduct.rows.length === 0) {
          await pool.query(`
            INSERT INTO products (name, description, price, category, image_url, stock_quantity, store_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            product.name,
            product.description,
            product.price,
            product.category,
            product.image_url,
            product.stock_quantity,
            storeData.store_id
          ]);
          
          totalProductsAdded++;
          console.log(`✅ Added product: ${product.name}`);
        } else {
          console.log(`⏭️  Product already exists: ${product.name}`);
        }
      }
    }

    console.log(`\n🎉 Successfully processed ${totalProductsAdded} new products across ${stores.length} stores!`);
    console.log('\nStores with products:');
    stores.forEach((store, index) => {
      console.log(`${index + 1}. ${store.store_name} (ID: ${store.id})`);
    });

  } catch (error) {
    console.error('❌ Error adding sample store products:', error.message);
    throw error;
  }
};

// Run the script if called directly
if (require.main === module) {
  addSampleStoreProducts()
    .then(() => {
      console.log('\n✅ Sample store products setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to add sample store products:', error);
      process.exit(1);
    });
}

module.exports = addSampleStoreProducts;