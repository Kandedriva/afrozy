#!/usr/bin/env node

/**
 * Fix Checkout Issues Script
 * This fixes common checkout problems:
 * 1. Products without store_id
 * 2. Sets up a default store for orphaned products
 */

const { pool } = require('../config/database');

async function fixCheckoutIssues() {
  const client = await pool.connect();

  console.log('🔧 FIXING CHECKOUT ISSUES');
  console.log('================================\n');

  try {
    await client.query('BEGIN');

    // 1. Check for products without store_id
    console.log('1️⃣  Checking for products without store_id...');
    const orphanedProducts = await client.query(`
      SELECT id, name, store_id
      FROM products
      WHERE store_id IS NULL
    `);

    if (orphanedProducts.rows.length === 0) {
      console.log('   ✅ No orphaned products found');
    } else {
      console.log(`   ⚠️  Found ${orphanedProducts.rows.length} products without store_id:`);
      orphanedProducts.rows.forEach(p => {
        console.log(`      - Product ${p.id}: ${p.name}`);
      });
      console.log('');

      // Check if we have any stores
      const storesCheck = await client.query(`
        SELECT id, store_name, owner_id
        FROM stores
        WHERE status = 'approved'
        ORDER BY created_at ASC
        LIMIT 1
      `);

      if (storesCheck.rows.length === 0) {
        console.log('   ❌ No approved stores found. Cannot assign products.');
        console.log('   📝 Action required:');
        console.log('      1. Create and approve at least one store');
        console.log('      2. Or delete these orphaned products');
        console.log('');
      } else {
        const defaultStore = storesCheck.rows[0];
        console.log(`   🏪 Assigning orphaned products to: ${defaultStore.store_name} (ID: ${defaultStore.id})`);

        // Assign orphaned products to the default store
        const updateResult = await client.query(`
          UPDATE products
          SET store_id = $1
          WHERE store_id IS NULL
          RETURNING id, name
        `, [defaultStore.id]);

        console.log(`   ✅ Assigned ${updateResult.rows.length} products to ${defaultStore.store_name}`);
        updateResult.rows.forEach(p => {
          console.log(`      - ${p.name} (ID: ${p.id})`);
        });
        console.log('');
      }
    }

    // 2. Check for invalid store_id references
    console.log('2️⃣  Checking for products with invalid store references...');
    const invalidStoreProducts = await client.query(`
      SELECT p.id, p.name, p.store_id
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      WHERE p.store_id IS NOT NULL AND s.id IS NULL
    `);

    if (invalidStoreProducts.rows.length > 0) {
      console.log(`   ⚠️  Found ${invalidStoreProducts.rows.length} products with invalid store_id`);
      console.log('   These products reference stores that don\'t exist');
      console.log('   Setting store_id to NULL for manual reassignment...');

      await client.query(`
        UPDATE products p
        SET store_id = NULL
        WHERE store_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM stores WHERE id = p.store_id)
      `);

      console.log('   ✅ Fixed invalid references');
    } else {
      console.log('   ✅ No invalid store references found');
    }
    console.log('');

    // 3. Summary
    console.log('3️⃣  Verification...');
    const finalCheck = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE store_id IS NULL) as products_without_store,
        COUNT(*) FILTER (WHERE store_id IS NOT NULL) as products_with_store,
        COUNT(*) as total_products
      FROM products
    `);

    const stats = finalCheck.rows[0];
    console.log(`   📊 Product Statistics:`);
    console.log(`      - Total products: ${stats.total_products}`);
    console.log(`      - With store: ${stats.products_with_store}`);
    console.log(`      - Without store: ${stats.products_without_store}`);
    console.log('');

    await client.query('COMMIT');

    if (parseInt(stats.products_without_store) > 0) {
      console.log('⚠️  WARNING: Some products still without store_id');
      console.log('   Action required:');
      console.log('   1. Create and approve stores first');
      console.log('   2. Then run this script again');
      console.log('   OR manually assign products in the admin panel');
    } else {
      console.log('✅ All products have valid store assignments!');
    }
    console.log('');

    // 4. Check Stripe Connect Status
    console.log('4️⃣  Stripe Connect Status...');
    const stripeCheck = await pool.query(`
      SELECT
        COUNT(*) as total_stores,
        COUNT(*) FILTER (WHERE stripe_connect_account_id IS NOT NULL) as stores_with_stripe,
        COUNT(*) FILTER (WHERE stripe_account_status = 'connected') as fully_connected
      FROM stores
      WHERE status = 'approved'
    `);

    const stripeStats = stripeCheck.rows[0];
    console.log(`   📊 Store Payment Status:`);
    console.log(`      - Total approved stores: ${stripeStats.total_stores}`);
    console.log(`      - With Stripe account: ${stripeStats.stores_with_stripe}`);
    console.log(`      - Fully connected: ${stripeStats.fully_connected}`);
    console.log('');

    if (parseInt(stripeStats.fully_connected) === 0) {
      console.log('❌ CRITICAL: No stores have completed Stripe Connect!');
      console.log('   Checkout WILL FAIL until stores set up payments.');
      console.log('');
      console.log('   📋 Next Steps:');
      console.log('   1. Store owners need to log in to their dashboard');
      console.log('   2. Navigate to "Payment Settings" or "Connect Stripe"');
      console.log('   3. Complete the Stripe Connect onboarding');
      console.log('');
      console.log('   🔗 Or use the admin panel to initiate Stripe Connect for stores');
    }

    console.log('================================');
    console.log('🎉 Checkout issue fix complete!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing issues:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the fix
fixCheckoutIssues().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
