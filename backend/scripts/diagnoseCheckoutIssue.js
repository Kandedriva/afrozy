#!/usr/bin/env node

/**
 * Diagnostic Script for Checkout Issues
 * This helps identify why checkout is failing with 500 error
 */

const { pool } = require('../config/database');

async function diagnoseCheckoutIssue() {
  console.log('🔍 AFROZY CHECKOUT DIAGNOSTIC');
  console.log('================================\n');

  try {
    // 1. Check Stripe Configuration
    console.log('1️⃣  Checking Stripe Configuration...');
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!stripeSecretKey) {
      console.log('   ❌ STRIPE_SECRET_KEY is missing in environment variables');
    } else if (stripeSecretKey.startsWith('sk_test_')) {
      console.log('   ⚠️  Using TEST Stripe key (sk_test_...)');
      console.log('   📝 Key preview:', stripeSecretKey.substring(0, 15) + '...');
    } else if (stripeSecretKey.startsWith('sk_live_')) {
      console.log('   ✅ Using LIVE Stripe key (sk_live_...)');
      console.log('   📝 Key preview:', stripeSecretKey.substring(0, 15) + '...');
    } else {
      console.log('   ❌ Invalid Stripe key format');
    }

    if (!stripePublishableKey) {
      console.log('   ❌ STRIPE_PUBLISHABLE_KEY is missing');
    } else {
      console.log('   ✅ STRIPE_PUBLISHABLE_KEY is set');
    }
    console.log('');

    // 2. Check Database Connection
    console.log('2️⃣  Checking Database Connection...');
    const dbTest = await pool.query('SELECT NOW() as current_time');
    console.log('   ✅ Database connected:', dbTest.rows[0].current_time);
    console.log('');

    // 3. Check Orders Table Schema
    console.log('3️⃣  Checking Orders Table Schema...');
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `);

    const requiredColumns = [
      'payment_intent_id', 'items', 'delivery_name', 'delivery_email',
      'delivery_phone', 'delivery_address', 'delivery_city', 'delivery_state',
      'delivery_zip', 'delivery_country', 'delivery_instructions'
    ];

    const existingColumns = tableCheck.rows.map(r => r.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('   ❌ Missing required columns:', missingColumns.join(', '));
    } else {
      console.log('   ✅ All required columns exist');
    }
    console.log('');

    // 4. Check Stores and Stripe Connect Status
    console.log('4️⃣  Checking Stores and Stripe Connect...');
    const storesCheck = await pool.query(`
      SELECT
        id,
        store_name,
        stripe_connect_account_id,
        stripe_account_status,
        status as store_status,
        owner_id
      FROM stores
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (storesCheck.rows.length === 0) {
      console.log('   ⚠️  No approved stores found');
    } else {
      console.log(`   📊 Found ${storesCheck.rows.length} approved store(s):\n`);

      storesCheck.rows.forEach(store => {
        console.log(`   Store: ${store.store_name} (ID: ${store.id})`);

        if (!store.stripe_connect_account_id) {
          console.log('      ❌ Stripe Connect: NOT SET UP');
          console.log('      ⚠️  This store cannot accept payments!');
        } else {
          console.log('      ✅ Stripe Account ID:', store.stripe_connect_account_id.substring(0, 20) + '...');
          console.log('      📝 Account Status:', store.stripe_account_status || 'unknown');

          if (store.stripe_account_status !== 'connected') {
            console.log('      ⚠️  Account not fully connected!');
          }
        }
        console.log('');
      });
    }

    // 5. Check if there are products with stores
    console.log('5️⃣  Checking Products...');
    const productsCheck = await pool.query(`
      SELECT COUNT(*) as count, store_id
      FROM products
      WHERE stock_quantity > 0
      GROUP BY store_id
      LIMIT 10
    `);

    if (productsCheck.rows.length === 0) {
      console.log('   ⚠️  No products with stock found');
    } else {
      console.log(`   ✅ Found products across ${productsCheck.rows.length} store(s)`);
      productsCheck.rows.forEach(row => {
        console.log(`      Store ID ${row.store_id}: ${row.count} products in stock`);
      });
    }
    console.log('');

    // 6. Check Cart Items Table Schema
    console.log('6️⃣  Checking Cart Items Table...');
    const cartTableCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'cart_items'
    `);

    const cartColumns = cartTableCheck.rows.map(r => r.column_name);
    const requiredCartColumns = ['user_id', 'session_id', 'product_id', 'quantity'];
    const missingCartColumns = requiredCartColumns.filter(col => !cartColumns.includes(col));

    if (missingCartColumns.length > 0) {
      console.log('   ❌ Missing columns:', missingCartColumns.join(', '));
    } else {
      console.log('   ✅ Cart table schema is correct');
    }
    console.log('');

    // 7. Provide Recommendations
    console.log('📋 RECOMMENDATIONS:');
    console.log('================================\n');

    if (!stripeSecretKey) {
      console.log('❌ CRITICAL: Set up Stripe API keys in production:');
      console.log('   - Add STRIPE_SECRET_KEY to your environment');
      console.log('   - Add STRIPE_PUBLISHABLE_KEY to your environment');
      console.log('');
    }

    const storesWithoutStripe = storesCheck.rows.filter(
      s => !s.stripe_connect_account_id || s.stripe_account_status !== 'connected'
    );

    if (storesWithoutStripe.length > 0) {
      console.log('❌ CRITICAL: Some stores need Stripe Connect setup:');
      storesWithoutStripe.forEach(store => {
        console.log(`   - ${store.store_name} (ID: ${store.id})`);
        console.log('     → Store owner needs to complete Stripe Connect onboarding');
      });
      console.log('');
      console.log('   To set up Stripe Connect:');
      console.log('   1. Store owners need to visit their dashboard');
      console.log('   2. Go to "Payment Settings" or "Connect Stripe"');
      console.log('   3. Complete the Stripe Connect onboarding');
      console.log('');
    }

    if (missingColumns.length > 0) {
      console.log('❌ CRITICAL: Database schema needs updates:');
      console.log('   Run: node backend/scripts/addDeliveryFieldsToOrders.js');
      console.log('');
    }

    // Success summary
    const issues = [];
    if (!stripeSecretKey) issues.push('Missing Stripe API keys');
    if (storesWithoutStripe.length > 0) issues.push(`${storesWithoutStripe.length} stores without Stripe Connect`);
    if (missingColumns.length > 0) issues.push('Missing database columns');

    if (issues.length === 0) {
      console.log('✅ No critical issues found!');
      console.log('   If checkout is still failing, check:');
      console.log('   - Backend server logs for specific errors');
      console.log('   - Network tab in browser DevTools');
      console.log('   - Stripe Dashboard for API errors');
    } else {
      console.log('⚠️  Issues to fix:', issues.join(', '));
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run diagnostic
diagnoseCheckoutIssue().catch(console.error);
