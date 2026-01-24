/**
 * Checkout Flow Test Script
 *
 * This script tests the three different checkout scenarios:
 * 1. Platform products only (no commission)
 * 2. Single store products (10% commission via destination charge)
 * 3. Mixed cart (platform + store items OR multiple stores, 10% commission via transfers)
 */

const { pool } = require('../config/database');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function printHeader(title) {
  log('\n' + '='.repeat(60), colors.cyan);
  log(`  ${title}`, colors.bold + colors.cyan);
  log('='.repeat(60) + '\n', colors.cyan);
}

async function testCheckoutFlows() {
  let client;

  try {
    printHeader('CHECKOUT FLOW TESTING');

    // Connect to database
    client = await pool.connect();
    log('✅ Database connected\n', colors.green);

    // Test 1: Check for platform products (store_id IS NULL)
    printHeader('Test 1: Platform Products (Admin Products)');
    const platformProductsQuery = `
      SELECT id, name, price, store_id
      FROM products
      WHERE store_id IS NULL
      LIMIT 5
    `;
    const platformProducts = await client.query(platformProductsQuery);

    if (platformProducts.rows.length === 0) {
      log('⚠️  No platform products found (store_id IS NULL)', colors.yellow);
      log('   Platform products should be added by admin without selecting a store\n', colors.yellow);
    } else {
      log(`✅ Found ${platformProducts.rows.length} platform product(s):`, colors.green);
      platformProducts.rows.forEach(p => {
        log(`   - ${p.name} ($${p.price}) [ID: ${p.id}, store_id: ${p.store_id}]`, colors.cyan);
      });
      log('\n   Payment Flow: Direct charge to platform account, NO commission', colors.blue);
      log('   Stripe API: paymentIntents.create({ amount, metadata: { platformOnly: "true" } })\n', colors.blue);
    }

    // Test 2: Check for store products
    printHeader('Test 2: Store Products (Single Store)');
    const storeProductsQuery = `
      SELECT p.id, p.name, p.price, p.store_id, s.store_name, s.stripe_connect_account_id, s.stripe_account_status
      FROM products p
      JOIN stores s ON p.store_id = s.id
      WHERE p.store_id IS NOT NULL
      LIMIT 5
    `;
    const storeProducts = await client.query(storeProductsQuery);

    if (storeProducts.rows.length === 0) {
      log('⚠️  No store products found', colors.yellow);
      log('   Store products should be added by store owners\n', colors.yellow);
    } else {
      log(`✅ Found ${storeProducts.rows.length} store product(s):`, colors.green);
      storeProducts.rows.forEach(p => {
        const stripeStatus = p.stripe_connect_account_id
          ? (p.stripe_account_status === 'connected' ? '✅ Connected' : '⚠️  Pending')
          : '❌ Not Connected';
        log(`   - ${p.name} ($${p.price}) from ${p.store_name} [${stripeStatus}]`, colors.cyan);
      });

      const connectedStores = storeProducts.rows.filter(p => p.stripe_account_status === 'connected');
      if (connectedStores.length > 0) {
        log('\n   Payment Flow (Single Store): Destination charge with 10% application fee', colors.blue);
        log('   Stripe API: paymentIntents.create({', colors.blue);
        log('     amount: totalAmount,', colors.blue);
        log('     application_fee_amount: totalAmount * 0.10,  // 10% to platform', colors.blue);
        log('     transfer_data: { destination: storeStripeAccountId }', colors.blue);
        log('   })\n', colors.blue);
      } else {
        log('\n   ⚠️  No stores have connected Stripe accounts', colors.yellow);
        log('   Stores need to complete Stripe Connect onboarding to accept payments\n', colors.yellow);
      }
    }

    // Test 3: Check for multi-vendor scenario
    printHeader('Test 3: Multi-Vendor Checkout (Multiple Stores or Platform + Store)');

    const storeCountQuery = `
      SELECT COUNT(DISTINCT store_id) as store_count
      FROM products
      WHERE store_id IS NOT NULL
    `;
    const storeCount = await client.query(storeCountQuery);
    const totalStores = parseInt(storeCount.rows[0].store_count);

    const hasPlatformProducts = platformProducts.rows.length > 0;
    const hasMultipleStores = totalStores > 1;

    if (hasPlatformProducts && storeProducts.rows.length > 0) {
      log('✅ Mixed cart scenario possible: Platform products + Store products', colors.green);
      log('   Example cart: 1 platform item + 1 store item\n', colors.cyan);
      log('   Payment Flow: Direct charge to platform, then transfer 90% to store', colors.blue);
      log('   Stripe API:', colors.blue);
      log('   1. paymentIntents.create({ amount: totalAmount, metadata: { multiVendor: "true" } })', colors.blue);
      log('   2. After payment succeeds:', colors.blue);
      log('      transfers.create({ amount: storeAmount * 0.90, destination: storeStripeAccountId })\n', colors.blue);
    }

    if (hasMultipleStores) {
      log(`✅ Multiple stores scenario possible: ${totalStores} different stores`, colors.green);
      const multiStoreQuery = `
        SELECT s.id, s.store_name, s.stripe_account_status, COUNT(p.id) as product_count
        FROM stores s
        LEFT JOIN products p ON p.store_id = s.id
        WHERE s.id IN (SELECT DISTINCT store_id FROM products WHERE store_id IS NOT NULL)
        GROUP BY s.id, s.store_name, s.stripe_account_status
        ORDER BY product_count DESC
      `;
      const stores = await client.query(multiStoreQuery);

      log('\n   Stores with products:', colors.cyan);
      stores.rows.forEach(s => {
        const status = s.stripe_account_status === 'connected' ? '✅' : '⚠️';
        log(`   - ${s.store_name}: ${s.product_count} product(s) ${status}`, colors.cyan);
      });

      log('\n   Payment Flow: Direct charge to platform, then transfer 90% to each store', colors.blue);
      log('   Stripe API:', colors.blue);
      log('   1. paymentIntents.create({ amount: totalAmount, metadata: { multiVendor: "true" } })', colors.blue);
      log('   2. After payment succeeds, for each store:', colors.blue);
      log('      transfers.create({ amount: storeAmount * 0.90, destination: storeStripeAccountId })\n', colors.blue);
    }

    if (!hasPlatformProducts && !hasMultipleStores) {
      log('⚠️  Multi-vendor scenario not available', colors.yellow);
      log('   Need either: Platform products + Store products, OR products from multiple stores\n', colors.yellow);
    }

    // Test 4: Check Stripe Connect status
    printHeader('Test 4: Stripe Connect Status');
    const stripeStatusQuery = `
      SELECT
        COUNT(*) as total_stores,
        COUNT(CASE WHEN stripe_connect_account_id IS NOT NULL THEN 1 END) as stores_with_account,
        COUNT(CASE WHEN stripe_account_status = 'connected' THEN 1 END) as connected_stores,
        COUNT(CASE WHEN stripe_charges_enabled = true THEN 1 END) as stores_accepting_payments
      FROM stores
      WHERE status = 'approved'
    `;
    const stripeStatus = await client.query(stripeStatusQuery);
    const stats = stripeStatus.rows[0];

    log(`Total approved stores: ${stats.total_stores}`, colors.cyan);
    log(`Stores with Stripe account: ${stats.stores_with_account}`, colors.cyan);
    log(`Fully connected stores: ${stats.connected_stores}`, colors.cyan);
    log(`Stores accepting payments: ${stats.stores_accepting_payments}\n`, colors.cyan);

    if (parseInt(stats.stores_accepting_payments) === 0) {
      log('⚠️  No stores can accept payments yet', colors.yellow);
      log('   Store owners need to complete Stripe Connect onboarding', colors.yellow);
      log('   URL: /store-dashboard -> Payments tab -> "Connect with Stripe"\n', colors.yellow);
    } else {
      log(`✅ ${stats.stores_accepting_payments} store(s) ready to accept payments\n`, colors.green);
    }

    // Test 5: Summary of commission structure
    printHeader('Test 5: Commission Structure Summary');
    log('Scenario 1: Platform Products Only', colors.bold + colors.blue);
    log('  - Customer pays: $100', colors.cyan);
    log('  - Platform receives: $100 (100%)', colors.green);
    log('  - Store receives: $0', colors.cyan);
    log('  - Commission: None\n', colors.cyan);

    log('Scenario 2: Single Store Products', colors.bold + colors.blue);
    log('  - Customer pays: $100', colors.cyan);
    log('  - Platform receives: $10 (10% application fee)', colors.green);
    log('  - Store receives: $90 (via destination charge)', colors.green);
    log('  - Commission: 10% to platform\n', colors.cyan);

    log('Scenario 3: Mixed Cart (Platform $50 + Store $50)', colors.bold + colors.blue);
    log('  - Customer pays: $100', colors.cyan);
    log('  - Platform receives initially: $100', colors.cyan);
    log('  - Platform keeps: $50 (platform items) + $5 (10% of $50) = $55', colors.green);
    log('  - Store receives: $45 (90% of $50, via transfer)', colors.green);
    log('  - Commission: 10% on store items only\n', colors.cyan);

    log('Scenario 4: Multiple Stores (Store A $60 + Store B $40)', colors.bold + colors.blue);
    log('  - Customer pays: $100', colors.cyan);
    log('  - Platform receives initially: $100', colors.cyan);
    log('  - Platform keeps: $6 (10% of $60) + $4 (10% of $40) = $10', colors.green);
    log('  - Store A receives: $54 (90% of $60, via transfer)', colors.green);
    log('  - Store B receives: $36 (90% of $40, via transfer)', colors.green);
    log('  - Commission: 10% to platform\n', colors.cyan);

    // Final recommendations
    printHeader('Recommendations');

    if (platformProducts.rows.length === 0) {
      log('📝 Add platform products (admin-added products) for testing Scenario 1', colors.yellow);
    }

    if (storeProducts.rows.length === 0) {
      log('📝 Have store owners add products for testing Scenarios 2, 3, 4', colors.yellow);
    }

    const unconnectedStores = await client.query(`
      SELECT store_name FROM stores
      WHERE status = 'approved'
      AND (stripe_connect_account_id IS NULL OR stripe_account_status != 'connected')
      LIMIT 3
    `);

    if (unconnectedStores.rows.length > 0) {
      log('📝 Complete Stripe Connect onboarding for:', colors.yellow);
      unconnectedStores.rows.forEach(s => {
        log(`   - ${s.store_name}`, colors.cyan);
      });
    }

    log('\n✅ All checkout flow tests completed!', colors.green);

  } catch (error) {
    log(`\n❌ Error during testing: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run tests
testCheckoutFlows();
