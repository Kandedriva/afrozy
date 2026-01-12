const { pool } = require('../config/database');

async function fixImageUrls() {
  try {
    console.log('🔧 Starting to fix image URLs in production...');

    // Get all products with image URLs
    const products = await pool.query('SELECT id, name, image_url FROM products WHERE image_url IS NOT NULL');
    
    console.log(`Found ${products.rows.length} products with image URLs`);

    let updatedCount = 0;
    
    for (const product of products.rows) {
      let { id, name, image_url } = product;
      let shouldUpdate = false;
      let newImageUrl = image_url;

      // Fix URLs that use localhost in production
      if (image_url.includes('localhost:3001') && process.env.NODE_ENV === 'production') {
        newImageUrl = image_url.replace('http://localhost:3001', 'https://afrozy.com');
        shouldUpdate = true;
        console.log(`🔄 Fixing localhost URL for product "${name}": ${image_url} -> ${newImageUrl}`);
      }

      // Fix URLs that are missing the domain
      if (image_url.startsWith('/api/images/')) {
        const baseUrl = process.env.NODE_ENV === 'production' ? 'https://afrozy.com' : 'http://localhost:3001';
        newImageUrl = `${baseUrl}${image_url}`;
        shouldUpdate = true;
        console.log(`🔄 Adding domain to relative URL for product "${name}": ${image_url} -> ${newImageUrl}`);
      }

      // Fix URLs that use incorrect domain or protocol
      if (image_url.startsWith('http://') && process.env.NODE_ENV === 'production') {
        newImageUrl = image_url.replace('http://', 'https://');
        shouldUpdate = true;
        console.log(`🔄 Fixing protocol for product "${name}": ${image_url} -> ${newImageUrl}`);
      }

      if (shouldUpdate) {
        await pool.query('UPDATE products SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newImageUrl, id]);
        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount} product image URLs successfully`);
    
    // Check if stores table has a logo column (it might not exist yet)
    try {
      const storeColumns = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'stores' AND column_name = 'logo_url'
      `);
      
      if (storeColumns.rows.length > 0) {
        const stores = await pool.query('SELECT id, store_name, logo_url FROM stores WHERE logo_url IS NOT NULL');
        
        if (stores.rows.length > 0) {
          console.log(`Found ${stores.rows.length} stores with logo URLs`);
          let storeUpdatedCount = 0;

          for (const store of stores.rows) {
            let { id, store_name, logo_url } = store;
            let shouldUpdate = false;
            let newLogoUrl = logo_url;

            if (logo_url.includes('localhost:3001') && process.env.NODE_ENV === 'production') {
              newLogoUrl = logo_url.replace('http://localhost:3001', 'https://afrozy.com');
              shouldUpdate = true;
              console.log(`🔄 Fixing localhost URL for store "${store_name}": ${logo_url} -> ${newLogoUrl}`);
            }

            if (logo_url.startsWith('/api/images/')) {
              const baseUrl = process.env.NODE_ENV === 'production' ? 'https://afrozy.com' : 'http://localhost:3001';
              newLogoUrl = `${baseUrl}${logo_url}`;
              shouldUpdate = true;
              console.log(`🔄 Adding domain to relative URL for store "${store_name}": ${logo_url} -> ${newLogoUrl}`);
            }

            if (shouldUpdate) {
              await pool.query('UPDATE stores SET logo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newLogoUrl, id]);
              storeUpdatedCount++;
            }
          }

          console.log(`✅ Updated ${storeUpdatedCount} store logo URLs successfully`);
        }
      } else {
        console.log('ℹ️  Stores table does not have logo_url column, skipping store logos');
      }
    } catch (logoError) {
      console.log('ℹ️  Could not check store logos (table might not have logo_url column)');
    }

  } catch (error) {
    console.error('❌ Error fixing image URLs:', error);
  } finally {
    await pool.end();
  }
}

// Run the script if called directly
if (require.main === module) {
  fixImageUrls();
}

module.exports = { fixImageUrls };