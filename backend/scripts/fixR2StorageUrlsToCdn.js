#!/usr/bin/env node

require('dotenv').config();
const { pool } = require('../config/database');
const logger = require('../config/logger');

/**
 * Script to convert R2 storage URLs to direct CDN URLs
 * Converts: https://d67b7e02209c84271845bf9179e2be37.r2.cloudflarestorage.com/afrozy-images/products/file.webp
 * To: https://cdn.afrozy.com/products/file.webp
 */

async function fixR2StorageUrlsToCdn() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking for products with R2 storage URLs...');

    // Find all products with R2 storage URLs
    const r2StoragePattern = '%.r2.cloudflarestorage.com%';
    const result = await client.query(
      'SELECT id, name, image_url FROM products WHERE image_url LIKE $1',
      [r2StoragePattern]
    );

    console.log(`📊 Found ${result.rows.length} products with R2 storage URLs`);

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
    const bucketName = process.env.R2_BUCKET_NAME || 'afrozy-images';

    for (const product of result.rows) {
      const oldUrl = product.image_url;

      // Extract the file path from the R2 storage URL
      // Format: https://d67b7e02209c84271845bf9179e2be37.r2.cloudflarestorage.com/afrozy-images/products/filename.webp
      const r2Match = oldUrl.match(/r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/);

      if (r2Match) {
        const filePath = r2Match[1]; // e.g., "products/1769374096086_c31c8282_African_dress.webp"
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
    console.log('🎉 Image URLs have been converted from R2 storage to CDN URLs!');

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error fixing R2 storage URLs:', error);
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  fixR2StorageUrlsToCdn()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = fixR2StorageUrlsToCdn;
