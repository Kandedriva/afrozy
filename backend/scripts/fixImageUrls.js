#!/usr/bin/env node

require('dotenv').config();
const { pool } = require('../config/database');
const logger = require('../config/logger');

async function fixImageUrls() {
  console.log('🔧 Starting image URL fix...');
  
  try {
    // Find all products with R2 storage URLs
    const result = await pool.query(`
      SELECT id, name, image_url 
      FROM products 
      WHERE image_url LIKE '%r2.cloudflarestorage.com%'
    `);
    
    console.log(`Found ${result.rows.length} products with R2 storage URLs`);
    
    for (const product of result.rows) {
      const oldUrl = product.image_url;
      
      // Extract the file path from the R2 URL
      // Example: https://d67b7e02209c84271845bf9179e2be37.r2.cloudflarestorage.com/afrozy-images/products/1766354903876_9c3b61fa_IMG_6240_large.webp
      const urlParts = oldUrl.split('/afrozy-images/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1]; // e.g., products/1766354903876_9c3b61fa_IMG_6240_large.webp
        const pathParts = filePath.split('/');
        
        if (pathParts.length >= 2) {
          const folder = pathParts[0];
          const filename = pathParts.slice(1).join('/');
          
          // Create new API proxy URL
          const apiBaseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://api.afrozy.com' 
            : (process.env.CLIENT_URL?.replace(':3000', ':3001') || 'http://localhost:3001');
          const newUrl = `${apiBaseUrl}/api/images/proxy/${folder}/${filename}`;
          
          // Update the product
          await pool.query(
            'UPDATE products SET image_url = $1 WHERE id = $2',
            [newUrl, product.id]
          );
          
          console.log(`✅ Updated product ${product.id} (${product.name})`);
          console.log(`   Old URL: ${oldUrl}`);
          console.log(`   New URL: ${newUrl}`);
        } else {
          console.log(`⚠️  Skipped product ${product.id}: Could not parse file path`);
        }
      } else {
        console.log(`⚠️  Skipped product ${product.id}: Invalid R2 URL format`);
      }
    }
    
    console.log('✅ Image URL fix completed successfully');
  } catch (error) {
    console.error('❌ Error fixing image URLs:', error);
    logger.error('Image URL fix error:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  fixImageUrls();
}

module.exports = fixImageUrls;