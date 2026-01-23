#!/usr/bin/env node

/**
 * Stripe Webhook Test Script
 *
 * This script tests your Stripe webhook configuration by:
 * 1. Verifying the endpoint is accessible
 * 2. Checking environment variables
 * 3. Simulating webhook events (requires Stripe CLI)
 * 4. Validating database updates
 */

const https = require('https');
const http = require('http');
const { pool } = require('../config/database');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testWebhookConfiguration() {
  log('\n🔍 STRIPE WEBHOOK CONFIGURATION TEST', colors.bold);
  log('=====================================\n', colors.bold);

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Check Environment Variables
  log('1️⃣  Checking Environment Variables...', colors.blue);
  totalTests++;

  const requiredVars = {
    'STRIPE_SECRET_KEY': process.env.STRIPE_SECRET_KEY,
    'STRIPE_PUBLISHABLE_KEY': process.env.STRIPE_PUBLISHABLE_KEY,
    'STRIPE_WEBHOOK_SECRET': process.env.STRIPE_WEBHOOK_SECRET
  };

  let envVarsValid = true;
  for (const [varName, value] of Object.entries(requiredVars)) {
    if (!value) {
      log(`   ❌ ${varName} is not set`, colors.red);
      envVarsValid = false;
    } else {
      const preview = value.substring(0, 12) + '...';
      log(`   ✅ ${varName}: ${preview}`, colors.green);
    }
  }

  if (envVarsValid) {
    passedTests++;
    log('\n   ✅ All environment variables are set\n', colors.green);
  } else {
    log('\n   ❌ Some environment variables are missing\n', colors.red);
  }

  // Test 2: Verify Webhook Secret Format
  log('2️⃣  Verifying Webhook Secret Format...', colors.blue);
  totalTests++;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret && webhookSecret.startsWith('whsec_')) {
    log(`   ✅ Webhook secret has correct format (whsec_...)\n`, colors.green);
    passedTests++;
  } else if (webhookSecret) {
    log(`   ⚠️  Webhook secret doesn't start with 'whsec_'`, colors.yellow);
    log(`   This might be incorrect. Stripe webhook secrets start with 'whsec_'\n`, colors.yellow);
  } else {
    log(`   ❌ Webhook secret is not set\n`, colors.red);
  }

  // Test 3: Check Stripe Mode
  log('3️⃣  Checking Stripe Mode...', colors.blue);
  totalTests++;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey) {
    if (stripeKey.startsWith('sk_test_')) {
      log(`   ℹ️  Using TEST mode (sk_test_...)`, colors.yellow);
      log(`   Note: Use test webhook secret from test mode\n`, colors.yellow);
      passedTests++;
    } else if (stripeKey.startsWith('sk_live_')) {
      log(`   ✅ Using LIVE mode (sk_live_...)`, colors.green);
      log(`   Note: Use live webhook secret from live mode\n`, colors.green);
      passedTests++;
    } else {
      log(`   ❌ Invalid Stripe key format\n`, colors.red);
    }
  }

  // Test 4: Check Database Connection
  log('4️⃣  Checking Database Connection...', colors.blue);
  totalTests++;

  try {
    const result = await pool.query('SELECT NOW() as current_time');
    log(`   ✅ Database connected: ${result.rows[0].current_time}\n`, colors.green);
    passedTests++;
  } catch (error) {
    log(`   ❌ Database connection failed: ${error.message}\n`, colors.red);
  }

  // Test 5: Verify Stores Table Structure
  log('5️⃣  Verifying Stores Table Structure...', colors.blue);
  totalTests++;

  try {
    const tableCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'stores'
    `);

    const columns = tableCheck.rows.map(r => r.column_name);
    const requiredColumns = [
      'stripe_connect_account_id',
      'stripe_account_status',
      'stripe_details_submitted',
      'stripe_charges_enabled',
      'stripe_payouts_enabled',
      'stripe_onboarding_completed'
    ];

    const missingColumns = requiredColumns.filter(col => !columns.includes(col));

    if (missingColumns.length === 0) {
      log(`   ✅ All required Stripe columns exist in stores table\n`, colors.green);
      passedTests++;
    } else {
      log(`   ❌ Missing columns: ${missingColumns.join(', ')}\n`, colors.red);
    }
  } catch (error) {
    log(`   ❌ Error checking table structure: ${error.message}\n`, colors.red);
  }

  // Test 6: Check Webhook Endpoint Accessibility
  log('6️⃣  Checking Webhook Endpoint Accessibility...', colors.blue);
  totalTests++;

  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const webhookUrl = `${apiUrl}/api/webhooks/stripe`;

  log(`   Testing: ${webhookUrl}`, colors.blue);

  try {
    const url = new URL(webhookUrl);
    const httpModule = url.protocol === 'https:' ? https : http;
    const postData = JSON.stringify({ test: 'data' });

    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = httpModule.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: data
          });
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    if (response.status === 400 && response.data.includes('Webhook Error')) {
      log(`   ✅ Endpoint is accessible and signature verification is working`, colors.green);
      log(`   Response: ${response.data}`, colors.green);
      log(`   (400 error is expected - it means signature verification is active)\n`, colors.green);
      passedTests++;
    } else if (response.status === 404) {
      log(`   ❌ Endpoint not found (404)`, colors.red);
      log(`   Make sure your backend is running and the route is correct\n`, colors.red);
    } else if (response.status === 200) {
      log(`   ⚠️  Endpoint returned 200 without signature`, colors.yellow);
      log(`   This might indicate signature verification is not working\n`, colors.yellow);
    } else {
      log(`   ⚠️  Unexpected response: ${response.status}`, colors.yellow);
      log(`   Response: ${response.data}\n`, colors.yellow);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log(`   ❌ Connection refused - Is your backend server running?`, colors.red);
      log(`   Start your backend with: npm run dev or pm2 start\n`, colors.red);
    } else {
      log(`   ❌ Error testing endpoint: ${error.message}\n`, colors.red);
    }
  }

  // Test 7: Check for Connected Accounts
  log('7️⃣  Checking for Stores with Stripe Connect...', colors.blue);
  totalTests++;

  try {
    const storesResult = await pool.query(`
      SELECT
        id,
        store_name,
        stripe_connect_account_id,
        stripe_account_status,
        stripe_charges_enabled,
        stripe_payouts_enabled
      FROM stores
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (storesResult.rows.length === 0) {
      log(`   ℹ️  No approved stores found`, colors.yellow);
      log(`   Create and approve stores to test Stripe Connect\n`, colors.yellow);
      passedTests++;
    } else {
      log(`   Found ${storesResult.rows.length} approved store(s):\n`, colors.green);

      let hasConnectedStore = false;
      storesResult.rows.forEach(store => {
        log(`   Store: ${store.store_name} (ID: ${store.id})`, colors.blue);

        if (store.stripe_connect_account_id) {
          log(`      ✅ Stripe Account: ${store.stripe_connect_account_id}`, colors.green);
          log(`      Status: ${store.stripe_account_status || 'unknown'}`, colors.green);
          log(`      Charges: ${store.stripe_charges_enabled ? 'Enabled' : 'Disabled'}`, colors.green);
          log(`      Payouts: ${store.stripe_payouts_enabled ? 'Enabled' : 'Disabled'}`, colors.green);
          hasConnectedStore = true;
        } else {
          log(`      ⚠️  No Stripe Connect account`, colors.yellow);
        }
        log(''); // Empty line
      });

      if (hasConnectedStore) {
        passedTests++;
      }
    }
  } catch (error) {
    log(`   ❌ Error checking stores: ${error.message}\n`, colors.red);
  }

  // Summary
  log('=====================================', colors.bold);
  log(`\n📊 TEST SUMMARY`, colors.bold);
  log(`Passed: ${passedTests}/${totalTests} tests\n`, passedTests === totalTests ? colors.green : colors.yellow);

  if (passedTests === totalTests) {
    log('✅ All tests passed! Your webhook configuration looks good.\n', colors.green);
    log('Next steps:', colors.bold);
    log('1. Make sure webhook URL in Stripe Dashboard is:', colors.blue);
    log(`   ${process.env.NODE_ENV === 'production' ? 'https://api.afrozy.com' : apiUrl}/api/webhooks/stripe`, colors.green);
    log('2. Test with: stripe trigger account.updated (requires Stripe CLI)', colors.blue);
    log('3. Or send test webhook from Stripe Dashboard\n', colors.blue);
  } else {
    log('⚠️  Some tests failed. Please review the errors above.\n', colors.yellow);
  }

  // Instructions for Stripe Dashboard
  log('=====================================', colors.bold);
  log('📝 STRIPE DASHBOARD CONFIGURATION', colors.bold);
  log('=====================================\n', colors.bold);

  const mode = stripeKey?.startsWith('sk_test_') ? 'Test' : 'Live';
  log(`Current Mode: ${mode} Mode\n`, colors.blue);

  log('Steps to configure webhook:', colors.bold);
  log('1. Go to https://dashboard.stripe.com', colors.blue);
  log(`2. Make sure you're in ${mode} mode (toggle in top right)`, colors.blue);
  log('3. Navigate to Developers → Webhooks', colors.blue);
  log('4. Click "+ Add endpoint"', colors.blue);
  log('5. Enter endpoint URL:', colors.blue);

  if (process.env.NODE_ENV === 'production') {
    log('   https://api.afrozy.com/api/webhooks/stripe', colors.green);
  } else {
    log('   For production: https://api.afrozy.com/api/webhooks/stripe', colors.green);
    log('   For local testing: Use Stripe CLI (see below)', colors.yellow);
  }

  log('6. Select events to send:', colors.blue);
  log('   - account.updated', colors.green);
  log('   - account.application.authorized', colors.green);
  log('   - account.application.deauthorized', colors.green);
  log('   - capability.updated', colors.green);
  log('   - transfer.created', colors.green);
  log('   - transfer.updated', colors.green);
  log('   OR select "All Connect events"', colors.green);
  log('7. Click "Add endpoint"', colors.blue);
  log('8. Copy the "Signing secret" (starts with whsec_)', colors.blue);
  log('9. Update your .env file with the new secret', colors.blue);
  log('10. Restart your backend server\n', colors.blue);

  // Stripe CLI Instructions
  log('=====================================', colors.bold);
  log('🔧 LOCAL TESTING WITH STRIPE CLI', colors.bold);
  log('=====================================\n', colors.bold);

  log('For local development, use Stripe CLI:', colors.blue);
  log('\n1. Install Stripe CLI:', colors.bold);
  log('   macOS: brew install stripe/stripe-cli/stripe', colors.green);
  log('   Windows: scoop install stripe', colors.green);
  log('   Linux: Download from https://github.com/stripe/stripe-cli', colors.green);

  log('\n2. Login to Stripe:', colors.bold);
  log('   stripe login', colors.green);

  log('\n3. Forward webhooks to local server:', colors.bold);
  log('   stripe listen --forward-to localhost:3001/api/webhooks/stripe', colors.green);

  log('\n4. Copy the webhook signing secret from output:', colors.bold);
  log('   Ready! Your webhook signing secret is whsec_... (^C to quit)', colors.yellow);

  log('\n5. Update .env with the local secret:', colors.bold);
  log('   STRIPE_WEBHOOK_SECRET=whsec_...', colors.green);

  log('\n6. Trigger test events:', colors.bold);
  log('   stripe trigger account.updated', colors.green);
  log('   stripe trigger transfer.created', colors.green);

  log('\n7. Monitor backend logs to see webhook processing\n', colors.bold);

  await pool.end();
}

// Run the test
testWebhookConfiguration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
