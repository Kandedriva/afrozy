# Stripe Webhook Setup Guide

**Date**: January 22, 2026
**Status**: Complete implementation, needs configuration
**Application**: Afrozy Marketplace

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Implementation](#current-implementation)
3. [Webhook Configuration Steps](#webhook-configuration-steps)
4. [Testing Webhooks](#testing-webhooks)
5. [All Stripe Functionalities](#all-stripe-functionalities)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Afrozy uses **Stripe Connect** for multi-vendor marketplace payments. Webhooks are essential for:

1. **Updating store statuses** when vendors complete Stripe onboarding
2. **Tracking payment capabilities** (charges_enabled, payouts_enabled)
3. **Handling account deauthorization** when stores disconnect
4. **Monitoring transfers** between platform and connected accounts

### Webhook Endpoint

**URL**: `https://api.afrozy.com/api/webhooks/stripe`
**Method**: POST
**Authentication**: Stripe signature verification

---

## ✅ Current Implementation

### 1. Webhook Handler

**File**: [backend/routes/webhooks.js](backend/routes/webhooks.js)

**Events Handled**:
- ✅ `account.updated` - Store account status changes
- ✅ `account.application.authorized` - Store connects to platform
- ✅ `account.application.deauthorized` - Store disconnects
- ✅ `capability.updated` - Payment capability changes
- ✅ `transfer.created` - Platform fee transfers
- ✅ `transfer.updated` - Transfer status updates

**Code Structure**:
```javascript
// Webhook endpoint with signature verification
router.post('/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'account.updated':
      await handleAccountUpdated(event.data.object);
      break;
    // ... other events
  }

  res.json({ received: true });
});
```

### 2. Database Updates

**What Gets Updated**:
```sql
UPDATE stores
SET stripe_details_submitted = $1,
    stripe_charges_enabled = $2,
    stripe_payouts_enabled = $3,
    stripe_account_status = $4,
    stripe_onboarding_completed = $5,
    stripe_connected_at = CURRENT_TIMESTAMP
WHERE stripe_connect_account_id = $6
```

**Account Statuses**:
- `not_connected` - No Stripe account
- `pending` - Account created, onboarding incomplete
- `connected` - Fully onboarded, can accept payments
- `restricted` - Account has issues, disabled

---

## 🔧 Webhook Configuration Steps

### Step 1: Access Stripe Dashboard

1. Go to https://dashboard.stripe.com
2. Sign in with your Stripe account
3. **IMPORTANT**: Make sure you're in the correct mode:
   - **Test Mode** for development (toggle in top right)
   - **Live Mode** for production

### Step 2: Navigate to Webhooks

1. Click **Developers** in the left sidebar
2. Click **Webhooks**
3. Click **+ Add endpoint** button

### Step 3: Configure Endpoint

#### For Development (Local Testing):

1. **Endpoint URL**:
   ```
   http://localhost:3001/api/webhooks/stripe
   ```

2. **Description**: `Afrozy Marketplace - Development`

3. **Events to send**: Select **Connect** events:
   - `account.updated`
   - `account.application.authorized`
   - `account.application.deauthorized`
   - `capability.updated`
   - `transfer.created`
   - `transfer.updated`

   **Or select**: `Select all Connect events` for comprehensive coverage

4. Click **Add endpoint**

#### For Production (Live):

1. **Endpoint URL**:
   ```
   https://api.afrozy.com/api/webhooks/stripe
   ```

2. **Description**: `Afrozy Marketplace - Production`

3. **Events to send**: Same as development (Connect events)

4. Click **Add endpoint**

### Step 4: Get Webhook Secret

After creating the endpoint:

1. Click on the newly created endpoint
2. Find the **Signing secret** section
3. Click **Reveal** to show the secret
4. Copy the secret (starts with `whsec_`)

**Example**:
```
whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

### Step 5: Update Environment Variables

#### Backend (.env.production)

Add or update in `/backend/.env.production`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_actual_live_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret

# Make sure these URLs match your production domain
CLIENT_URL=https://afrozy.com
API_URL=https://api.afrozy.com
```

#### Development (.env)

For local testing with Stripe CLI (see Step 6):

```bash
# Stripe Configuration (Test Mode)
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_development_webhook_secret

# Local URLs
CLIENT_URL=http://localhost:3000
API_URL=http://localhost:3001
```

### Step 6: Testing with Stripe CLI (Development)

**Install Stripe CLI**:

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (using Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_amd64.tar.gz
tar -xvf stripe_linux_amd64.tar.gz
sudo mv stripe /usr/local/bin/
```

**Login to Stripe**:

```bash
stripe login
```

**Forward Webhooks to Local Server**:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

This will:
- Forward all Stripe events to your local endpoint
- Display events in real-time
- Provide a webhook signing secret for testing

**Output Example**:
```
> Ready! Your webhook signing secret is whsec_1234... (^C to quit)
```

**Use this secret in your local `.env`**:
```bash
STRIPE_WEBHOOK_SECRET=whsec_1234...
```

### Step 7: Trigger Test Events

While `stripe listen` is running, you can trigger test events:

```bash
# Trigger account update event
stripe trigger account.updated

# Trigger transfer created event
stripe trigger transfer.created
```

Watch your backend logs to see webhook processing:
```
Received webhook event: account.updated
Processing account update for: acct_xxxxx
Updated store with Stripe account acct_xxxxx
```

---

## 🧪 Testing Webhooks

### 1. Test Account Update

**Scenario**: Store completes Stripe onboarding

**Steps**:
1. Create a test Connected Account in Stripe Dashboard
2. Complete onboarding for the account
3. Webhook fires: `account.updated`
4. Verify database update:

```sql
SELECT
  store_name,
  stripe_account_status,
  stripe_charges_enabled,
  stripe_payouts_enabled,
  stripe_onboarding_completed
FROM stores
WHERE stripe_connect_account_id = 'acct_xxxxx';
```

**Expected Result**:
```
store_name: "Test Store"
stripe_account_status: "connected"
stripe_charges_enabled: true
stripe_payouts_enabled: true
stripe_onboarding_completed: true
```

### 2. Test Account Deauthorization

**Scenario**: Store disconnects from platform

**Steps**:
1. Go to Stripe Dashboard → Connect → Accounts
2. Find a connected account
3. Click **Disconnect**
4. Webhook fires: `account.application.deauthorized`
5. Verify database update:

```sql
SELECT
  store_name,
  stripe_account_status,
  stripe_charges_enabled
FROM stores
WHERE stripe_connect_account_id = 'acct_xxxxx';
```

**Expected Result**:
```
store_name: "Test Store"
stripe_account_status: "not_connected"
stripe_charges_enabled: false
```

### 3. Monitor Webhook Logs

**Backend Logs**:
```bash
# Development
npm run dev

# Production
pm2 logs afrozy-backend
```

**Stripe Dashboard**:
1. Go to **Developers** → **Webhooks**
2. Click on your endpoint
3. View **Event logs** tab
4. See successful/failed webhook deliveries

**Look for**:
- ✅ 200 status codes (success)
- ❌ 400/500 status codes (errors)
- ⏱️ Response times

---

## 🚀 All Stripe Functionalities

### 1. Payment Processing

**Endpoint**: `/api/checkout/process`

**Features**:
- Creates Payment Intents
- Splits payments between platform and store owners
- Applies platform commission (10%)
- Transfers funds to connected accounts

**Example Flow**:
```
Customer pays $100
↓
Platform receives $100
↓
Platform fee: $10 (10%)
Store gets: $90
↓
Transfer $90 to store's Stripe account
```

### 2. Stripe Connect Onboarding

**Endpoints**:
- `POST /api/stripe-connect/create-account` - Create Connect account
- `POST /api/stripe-connect/create-onboarding-link` - Generate onboarding URL
- `GET /api/stripe-connect/account-status` - Check account status

**Features**:
- Express account type (simplified onboarding)
- Automatic capability requests (card_payments, transfers)
- Onboarding URL generation with refresh/return URLs
- Real-time status updates via webhooks

### 3. Dashboard Access

**Endpoint**: `POST /api/stripe-connect/create-login-link`

**Feature**: Store owners can access their Stripe Express Dashboard

**What They Can Do**:
- View transaction history
- Manage payouts
- Update bank account
- View tax documents
- Manage disputes

### 4. Balance Inquiry

**Endpoint**: `GET /api/stripe-connect/balance`

**Feature**: Store owners can check their available/pending balance

**Response**:
```json
{
  "success": true,
  "data": {
    "available": [
      {
        "amount": 9000,
        "currency": "usd"
      }
    ],
    "pending": [
      {
        "amount": 2000,
        "currency": "usd"
      }
    ]
  }
}
```

### 5. Account Disconnection

**Endpoint**: `DELETE /api/stripe-connect/disconnect`

**Feature**: Store owners can disconnect their Stripe account

**Effect**:
- Removes association from database
- Does NOT delete Stripe account (preserves payout history)
- Prevents new transactions
- Existing payouts still process

### 6. Failed Transfer Handling

**Feature**: Automatic retry mechanism for failed transfers

**Database Table**: `failed_transfers`

**Process**:
1. Transfer fails (invalid account, insufficient funds, etc.)
2. Error logged to `failed_transfers` table
3. Retry attempted up to 3 times with exponential backoff
4. After 3 failures, marked for manual review
5. Admin can retry or resolve manually

**Retry Schedule**:
- 1st retry: Immediate
- 2nd retry: 5 minutes later
- 3rd retry: 15 minutes later

---

## 🌐 Production Deployment

### 1. Verify Environment Variables

```bash
# SSH into production server
ssh user@your-server.com

# Check environment variables
cd /path/to/afrozy/backend
cat .env.production | grep STRIPE
```

**Should see**:
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Restart Backend Server

```bash
# If using PM2
pm2 restart afrozy-backend

# If using Docker
docker-compose -f docker-compose.prod.yml restart backend

# Verify logs
pm2 logs afrozy-backend --lines 100
```

### 3. Test Webhook Endpoint

```bash
# Test endpoint is accessible
curl -X POST https://api.afrozy.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "ping"}'
```

**Expected Response** (400 error is OK, means signature verification is working):
```json
Webhook Error: No signatures found matching the expected signature for payload
```

### 4. Configure Firewall (if applicable)

Ensure your server accepts POST requests from Stripe's IPs:

**Stripe IP Ranges**:
```
3.18.12.63
3.130.192.231
13.235.14.237
13.235.122.149
...
```

**Full list**: https://stripe.com/docs/ips

### 5. Enable Webhooks in Stripe Dashboard

1. Go to https://dashboard.stripe.com
2. **Switch to LIVE mode** (top right toggle)
3. Navigate to **Developers** → **Webhooks**
4. Add endpoint: `https://api.afrozy.com/api/webhooks/stripe`
5. Select Connect events
6. Copy webhook secret
7. Update production `.env.production` file
8. Restart backend

### 6. Verify Webhook Delivery

1. In Stripe Dashboard → Webhooks
2. Click on your production endpoint
3. Click **Send test webhook**
4. Select `account.updated` event
5. Send webhook

**Check Backend Logs**:
```bash
pm2 logs afrozy-backend --lines 50
```

**Should see**:
```
Received webhook event: account.updated
Processing account update for: acct_test123
```

---

## 🔍 Troubleshooting

### Issue 1: Webhook Signature Verification Failed

**Error**:
```
Webhook signature verification failed
```

**Causes**:
1. Wrong webhook secret in `.env`
2. Webhook secret from Test mode used in Live mode (or vice versa)
3. Body parser modified request body before verification

**Solution**:
```bash
# Verify webhook secret matches Stripe Dashboard
cat backend/.env.production | grep STRIPE_WEBHOOK_SECRET

# Make sure webhook route is BEFORE body parsing middleware
# In backend/index.js:
app.use('/api/webhooks', webhookRoutes);  // ✅ Before body parser
app.use(express.json());  // ✅ After webhooks
```

### Issue 2: Webhook Not Firing

**Symptoms**:
- Store completes onboarding
- Database not updating
- No logs in backend

**Solutions**:

**A. Check Stripe Dashboard**:
1. Go to Developers → Webhooks
2. Click on endpoint
3. Check **Event logs** tab
4. Look for delivery attempts

**B. Verify Endpoint URL**:
```bash
# Test endpoint is accessible
curl -I https://api.afrozy.com/api/webhooks/stripe
```

**C. Check HTTPS**:
- Stripe requires HTTPS in production
- Use `http://` only for local testing with Stripe CLI

**D. Check Server Logs**:
```bash
# No requests received?
grep "webhook" /var/log/nginx/access.log
```

### Issue 3: Store Status Not Updating

**Symptoms**:
- Webhook fires successfully (200 response)
- Database not updated

**Debug Steps**:

1. **Check Database Connection**:
```bash
node backend/scripts/diagnoseCheckoutIssue.js
```

2. **Check Account ID Match**:
```sql
SELECT id, store_name, stripe_connect_account_id
FROM stores
WHERE stripe_connect_account_id = 'acct_xxxxx';
```

3. **Check Backend Logs**:
```bash
pm2 logs afrozy-backend | grep "account update"
```

**Common Issues**:
- Account ID in webhook doesn't match database
- Database query failing silently
- Permissions issue on stores table

### Issue 4: Environment Variable Not Loaded

**Error**:
```
endpointSecret is undefined
```

**Solution**:
```bash
# Verify .env file location
ls -la backend/.env.production

# Check file permissions
chmod 600 backend/.env.production

# Restart with explicit env file
cd backend
NODE_ENV=production node index.js

# Or with PM2
pm2 restart afrozy-backend --update-env
```

### Issue 5: CORS Errors in Production

**Error**:
```
Access to webhook at 'https://api.afrozy.com/webhooks/stripe' blocked by CORS
```

**Note**: This is NOT a CORS issue! Webhooks are server-to-server (Stripe → Your API)

**Actual Cause**: Something else is trying to access the webhook URL from a browser

**Solution**: Webhooks should only be called by Stripe servers, not from frontend

---

## 📊 Monitoring Webhooks

### 1. Set Up Logging

**Backend logging** is already configured:

```javascript
// backend/routes/webhooks.js
console.log('Received webhook event:', event.type);
console.log('Processing account update for:', account.id);
```

**View logs**:
```bash
# PM2
pm2 logs afrozy-backend --lines 100

# Docker
docker logs afrozy-backend --tail 100 --follow

# Direct
tail -f backend/logs/error.log
tail -f backend/logs/combined.log
```

### 2. Stripe Dashboard Monitoring

1. **Developers** → **Webhooks**
2. Click on endpoint
3. **Event logs** tab

**Metrics to monitor**:
- Success rate (should be > 99%)
- Average response time (should be < 1000ms)
- Failed deliveries
- Event types received

### 3. Set Up Alerts

**Stripe Email Alerts**:
1. Dashboard → **Settings** → **Webhooks settings**
2. Enable **Email me when webhook endpoint fails**

**Custom Monitoring** (Optional):
- Use Sentry for error tracking
- Set up New Relic for performance monitoring
- Use Datadog for webhook analytics

---

## 🔐 Security Best Practices

### 1. Always Verify Signatures

✅ **Current implementation** (secure):
```javascript
event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
```

❌ **Never do this** (insecure):
```javascript
const event = req.body;  // No signature verification!
```

### 2. Use HTTPS in Production

✅ Webhooks configured with `https://api.afrozy.com`
❌ Never use `http://` for production webhooks

### 3. Keep Webhook Secret Private

- Store in environment variables
- Never commit to Git
- Rotate periodically (every 90 days)
- Different secrets for test/live modes

### 4. Implement Idempotency

✅ **Current implementation** handles duplicate events:
```javascript
// Database updates use UPSERT logic
stripe_connected_at = CASE
  WHEN $2 = true AND $3 = true AND stripe_connected_at IS NULL
  THEN CURRENT_TIMESTAMP
  ELSE stripe_connected_at
END
```

### 5. Rate Limiting

✅ Already implemented in `backend/config/security.js`:
```javascript
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

---

## 📝 Summary Checklist

### Setup Checklist

- [ ] Created webhook endpoint in Stripe Dashboard
- [ ] Selected Connect events to listen for
- [ ] Copied webhook signing secret
- [ ] Added `STRIPE_WEBHOOK_SECRET` to `.env.production`
- [ ] Restarted backend server
- [ ] Tested webhook delivery
- [ ] Verified database updates
- [ ] Monitored webhook logs
- [ ] Set up failure alerts

### Production Checklist

- [ ] Using Live mode keys (`sk_live_`, `pk_live_`)
- [ ] Webhook URL uses HTTPS
- [ ] Endpoint is publicly accessible
- [ ] Firewall allows Stripe IPs
- [ ] Environment variables loaded correctly
- [ ] Backend logs show webhook events
- [ ] Test onboarding completes successfully
- [ ] Database updates confirmed
- [ ] Monitoring configured

---

## 🚀 Next Steps

1. **Complete Stripe Connect Setup**:
   - Have store owners complete onboarding
   - Verify `stripe_account_status = 'connected'`
   - Test end-to-end payment flow

2. **Monitor Webhook Health**:
   - Check Stripe Dashboard daily
   - Review backend logs weekly
   - Investigate any failures immediately

3. **Implement Additional Events** (Optional):
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `payout.paid`
   - `payout.failed`

4. **Set Up Email Notifications**:
   - Notify stores when onboarding completes
   - Alert on failed transfers
   - Send payout confirmations

---

## 📚 Additional Resources

- [Stripe Connect Webhooks Documentation](https://stripe.com/docs/connect/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Stripe Connect Overview](https://stripe.com/docs/connect)
- [Express Accounts](https://stripe.com/docs/connect/express-accounts)

---

**Document Version**: 1.0
**Last Updated**: January 22, 2026
**Maintained By**: Afrozy Development Team
