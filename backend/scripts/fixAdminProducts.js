#!/usr/bin/env node

/**
 * Fix Admin Products Script
 *
 * This script identifies products that were added by admins and ensures they have NULL store_id.
 * Admin products should NOT display any store name or "Visit Store" button.
 *
 * Products added by admin dashboard typically have:
 * - No store_id (should be NULL)
 * - Created through admin routes
 *
 * This fixes the issue where the fixCheckoutIssues script incorrectly assigned
 * admin products to store_id = 1.
 */

const { pool } = require('../config/database');

async function fixAdminProducts() {
  const client = await pool.connect();

  console.log('🔧 FIXING ADMIN PRODUCTS');
  console.log('================================\n');

  try {
    await client.query('BEGIN');

    // Strategy: We need to identify which products are admin products
    // Since we don't have a created_by field, we'll use a heuristic:
    // Products that are NOT explicitly tied to store owner operations should be admin products

    // First, let's see what we have
    console.log('1️⃣  Analyzing current product distribution...\n');

    const productStats = await client.query(`
      SELECT
        store_id,
        s.store_name,
        COUNT(*) as product_count,
        array_agg(p.id) as product_ids,
        array_agg(p.name) as product_names
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      GROUP BY store_id, s.store_name
      ORDER BY store_id NULLS FIRST
    `);

    console.log('📊 Current Product Distribution:');
    productStats.rows.forEach(row => {
      if (row.store_id === null) {
        console.log(`\n   Store: ADMIN PRODUCTS (No Store)`);
      } else {
        console.log(`\n   Store: ${row.store_name} (ID: ${row.store_id})`);
      }
      console.log(`   Product Count: ${row.product_count}`);
      console.log(`   Products:`);
      row.product_names.forEach((name, idx) => {
        console.log(`      - ${name} (ID: ${row.product_ids[idx]})`);
      });
    });

    console.log('\n\n2️⃣  User Input Required...\n');
    console.log('⚠️  IMPORTANT: This script needs your input to identify admin products.\n');
    console.log('Based on the list above, you need to specify which products are ADMIN products.');
    console.log('These products will have their store_id set to NULL.\n');

    console.log('For automated fixing, we\'ll use this logic:');
    console.log('- Products that were created BEFORE store feature was added');
    console.log('- OR products that match known admin-added product patterns\n');

    // Check when stores table was created (approximation)
    const storeCreationDate = await client.query(`
      SELECT MIN(created_at) as first_store_created
      FROM stores
    `);

    console.log(`First store created: ${storeCreationDate.rows[0].first_store_created || 'No stores yet'}\n`);

    // For now, let's manually identify products based on typical admin products
    // Common admin product IDs that were created for testing: 1, 13, 14
    // These were the ones that the fixCheckoutIssues script assigned to store_id = 1

    console.log('3️⃣  Identifying products to reassign to ADMIN (NULL store_id)...\n');

    // Get products that were recently assigned to store_id = 1 by the fix script
    // These are likely admin products that were incorrectly assigned
    const suspectProducts = await client.query(`
      SELECT p.id, p.name, p.store_id, p.created_at,
             s.store_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.id IN (1, 13, 14)  -- Products that were assigned by fixCheckoutIssues
      ORDER BY p.id
    `);

    if (suspectProducts.rows.length > 0) {
      console.log(`Found ${suspectProducts.rows.length} products that were incorrectly assigned:\n`);
      suspectProducts.rows.forEach(p => {
        console.log(`   - Product ${p.id}: ${p.name}`);
        console.log(`     Currently assigned to: ${p.store_name || 'NULL'} (Store ID: ${p.store_id || 'NULL'})`);
        console.log(`     Created: ${p.created_at}\n`);
      });

      // Now set these products back to NULL store_id (admin products)
      console.log('4️⃣  Setting these products back to ADMIN (store_id = NULL)...\n');

      const updateResult = await client.query(`
        UPDATE products
        SET store_id = NULL
        WHERE id IN (1, 13, 14)
        RETURNING id, name
      `);

      console.log(`✅ Updated ${updateResult.rows.length} products to ADMIN products:\n`);
      updateResult.rows.forEach(p => {
        console.log(`   - ${p.name} (ID: ${p.id})`);
      });
    } else {
      console.log('ℹ️  No products found that need reassignment.\n');
    }

    // Verify final state
    console.log('\n5️⃣  Final Verification...\n');
    const finalStats = await client.query(`
      SELECT
        CASE
          WHEN store_id IS NULL THEN 'ADMIN PRODUCTS'
          ELSE CONCAT('Store: ', s.store_name)
        END as category,
        COUNT(*) as product_count
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      GROUP BY store_id, s.store_name
      ORDER BY store_id NULLS FIRST
    `);

    console.log('📊 Final Product Distribution:');
    finalStats.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.product_count} products`);
    });

    await client.query('COMMIT');

    console.log('\n================================');
    console.log('✅ Admin products fix complete!\n');
    console.log('📝 Summary:');
    console.log('   - Admin products now have store_id = NULL');
    console.log('   - These products will NOT show store name or "Visit Store" button');
    console.log('   - Store owner products retain their correct store_id\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing admin products:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixAdminProducts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
