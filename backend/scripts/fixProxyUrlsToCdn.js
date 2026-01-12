#!/usr/bin/env node

require('dotenv').config();
const { pool } = require('../config/database');
const logger = require('../config/logger');

/**
 * Script to convert proxy URLs to direct CDN URLs
 * Converts: https://api.afrozy.com/api/images/proxy/products/file.webp
 * To: https://cdn.afrozy.com/products/file.webp
 */

async function fixProxyUrlsToCdn() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking for products with proxy URLs...');

    // Find all products with proxy URLs
    const proxyUrlPattern = '%/api/images/proxy/%';
    const result = await client.query(
      'SELECT id, name, image_url FROM products WHERE image_url LIKE $1',
      [proxyUrlPattern]
    );

    console.log(`📊 Found ${result.rows.length} products with proxy URLs`);

    if (result.rows.length === 0) {
      console.log('✅ No products need updating');
      return;
    }

    // Show products that will be updated
    console.log('\n📝 Products to update:');
    result.rows.forEach(product => {
      console.log(`  - ID ${product.id}: ${product.name}`);
      console.log(`    Current: ${product.image_url}`);
    });

    console.log('\n🔄 Starting update process...');

    await client.query('BEGIN');

    let updatedCount = 0;
    const cdnUrl = process.env.R2_PUBLIC_URL || 'https://cdn.afrozy.com';

    for (const product of result.rows) {
      const oldUrl = product.image_url;

      // Extract the file path from the proxy URL
      // Format: https://api.afrozy.com/api/images/proxy/products/filename.webp
      // or: http://localhost:3001/api/images/proxy/products/filename.webp
      const proxyMatch = oldUrl.match(/\/api\/images\/proxy\/(.+)$/);

      if (proxyMatch) {
        const filePath = proxyMatch[1]; // e.g., "products/1767654625494_59b5edf1_IMG_6240.webp"
        const newUrl = cdnUrl.endsWith('/')
          ? `${cdnUrl}${filePath}`
          : `${cdnUrl}/${filePath}`;

        // Update the product
        await client.query(
          'UPDATE products SET image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newUrl, product.id]
        );

        console.log(`  ✅ Updated product ${product.id}`);
        console.log(`     Old: ${oldUrl}`);
        console.log(`     New: ${newUrl}`);

        updatedCount++;
      } else {
        console.log(`  ⚠️  Could not parse URL for product ${product.id}: ${oldUrl}`);
      }
    }

    await client.query('COMMIT');

    console.log(`\n✨ Successfully updated ${updatedCount} products`);
    console.log('🎉 Image URLs have been converted to CDN URLs!');

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error fixing proxy URLs:', error);
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  fixProxyUrlsToCdn()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = fixProxyUrlsToCdn;
