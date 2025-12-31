#!/usr/bin/env node

require('dotenv').config();
const { pool } = require('../config/database');

async function updateProductionImageUrls() {
  console.log('🔧 Updating image URLs for production environment...');
  
  try {
    // Update all localhost URLs to production URLs
    const result = await pool.query(`
      UPDATE products 
      SET image_url = REPLACE(image_url, 'http://localhost:3001', 'https://api.afrozy.com')
      WHERE image_url LIKE '%localhost:3001%'
      RETURNING id, name, image_url
    `);
    
    if (result.rowCount > 0) {
      console.log(`✅ Updated ${result.rowCount} products to use production URLs:`);
      result.rows.forEach(p => {
        console.log(`   ${p.id}: ${p.name}`);
        console.log(`      → ${p.image_url}`);
      });
    } else {
      console.log('✅ No products needed URL updates');
    }
    
    // Verify the update worked
    const verifyQuery = await pool.query(`
      SELECT COUNT(*) as localhost_count
      FROM products 
      WHERE image_url LIKE '%localhost%'
    `);
    
    const localhostCount = parseInt(verifyQuery.rows[0].localhost_count);
    if (localhostCount === 0) {
      console.log('✅ All products now use production URLs');
    } else {
      console.log(`⚠️  ${localhostCount} products still have localhost URLs`);
    }
    
    console.log('✅ Production URL update completed successfully');
  } catch (error) {
    console.error('❌ Error updating production URLs:', error.message);
    throw error;
  }
}

if (require.main === module) {
  updateProductionImageUrls()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = updateProductionImageUrls;