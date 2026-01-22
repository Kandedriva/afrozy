# 🛒 Checkout Issue Fix Guide

## 🔍 Problem Identified

Your checkout is failing with **500 Internal Server Error** because:

1. ✅ **FIXED**: Products without store_id (3 products were orphaned)
2. ❌ **NEEDS FIX**: No stores have Stripe Connect set up

## ✅ What We Fixed

### Issue 1: Orphaned Products
**Problem**: 3 products had `store_id = NULL`, causing database errors during checkout

**Solution**: Assigned all orphaned products to "Jamaa online Market" (Store ID: 1)

Fixed products:
- La paix.(Cognon mousso yako) (ID: 13)
- Attiké & Poisson (ID: 14)
- Wireless Bluetooth Headphones (ID: 1)

---

## ❌ Critical Issue: Stripe Connect Not Set Up

### Current Status
```
Total Approved Stores: 4
With Stripe Account: 0 ❌
Fully Connected: 0 ❌
```

**Stores needing Stripe Connect:**
1. Jamaa online Market (ID: 1)
2. Tech Haven Electronics (ID: 8)
3. Urban Fashion Boutique (ID: 9)
4. Cozy Home & Garden (ID: 10)

### Why Checkout Fails

When a customer tries to checkout, the backend code:
1. Gets items from cart
2. Groups items by store
3. **Checks if all stores have Stripe Connect** ← FAILS HERE
4. Returns error: "Some stores haven't set up payments yet"

The error happens at `backend/routes/checkout.js:166-177`:

```javascript
const storesWithoutStripe = stores.filter(store =>
  !store.stripe_connect_account_id || store.stripe_account_status !== 'connected'
);

if (storesWithoutStripe.length > 0) {
  return res.status(400).json({
    success: false,
    message: `Some stores haven't set up payments yet: ${storesWithoutStripe.map(s => s.store_name).join(', ')}`
  });
}
```

---

## 🔧 Solution: Set Up Stripe Connect

### Option 1: Via Store Owner Dashboard (Recommended)

**For each store owner:**

1. **Log in to store dashboard**
   - Visit: https://afrozy.com (or your production URL)
   - Navigate to: Store Owner Login
   - Enter credentials

2. **Navigate to Payment Settings**
   - In the dashboard, look for "Payment Settings" or "Stripe Connect"
   - Click "Connect Stripe" or "Set up payments"

3. **Complete Stripe Onboarding**
   - Click the "Connect with Stripe" button
   - You'll be redirected to Stripe's onboarding page
   - Fill in:
     - Business information
     - Bank account details
     - Tax information (if required)
   - Accept Stripe's terms

4. **Verify Connection**
   - After completing onboarding, you'll be redirected back
   - Dashboard should show "Stripe Connected ✅"
   - Status should be "connected"

### Option 2: Via API (For Testing/Development)

**Create Stripe Connect account programmatically:**

```bash
# Using the API endpoint
curl -X POST http://localhost:3001/api/stripe-connect/create-account \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "email": "store@example.com",
    "country": "US",
    "business_type": "individual"
  }'
```

**Response will include `onboardingUrl` - visit this URL to complete setup.**

### Option 3: Via Admin Panel (If Available)

1. Log in as admin
2. Go to "Stores" management
3. Select a store
4. Click "Set up Stripe Connect"
5. Follow the onboarding flow

---

## 🧪 Testing After Setup

### 1. Verify Stripe Connect Status

Run diagnostic script:
```bash
cd /Users/drissakande/afrozy/backend
node scripts/diagnoseCheckoutIssue.js
```

Look for:
```
✅ Stripe Account ID: acct_xxxxx...
📝 Account Status: connected
```

### 2. Test Checkout Flow

1. **Add items to cart**
   - Visit your store
   - Add 1-2 products to cart

2. **Proceed to checkout**
   - Click cart icon
   - Click "Continue to Payment"
   - Fill in delivery information

3. **Verify payment form loads**
   - You should see Stripe payment form
   - No "500 Internal Server Error"
   - No "stores haven't set up payments" error

4. **Test payment (optional)**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Complete payment

### 3. Check Backend Logs

If still failing, check logs:
```bash
# Docker
docker-compose -f docker-compose.prod.yml logs backend

# Local
npm run start (check console output)
```

---

## 🔐 Stripe Test Keys vs Live Keys

### Current Setup (from diagnostic)
```
⚠️  Using TEST Stripe key (sk_test_...)
```

**Test Mode:**
- Use test cards (4242 4242 4242 4242)
- No real money transferred
- Good for development

**Live Mode:**
- Requires live Stripe keys (sk_live_...)
- Real money is transferred
- Only use in production with proper setup

### Switching to Live Mode

1. **Get live API keys from Stripe Dashboard:**
   - Visit: https://dashboard.stripe.com
   - Go to: Developers → API keys
   - Copy "Secret key" (starts with `sk_live_`)
   - Copy "Publishable key" (starts with `pk_live_`)

2. **Update environment variables:**
   ```bash
   # backend/.env.production
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   ```

3. **Update frontend:**
   ```bash
   # frontend/.env.production
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   ```

4. **Restart services**

---

## 📋 Checklist

### Immediate Actions
- [x] ✅ Fixed orphaned products (assigned to Store ID: 1)
- [x] ✅ Verified database schema is correct
- [x] ✅ Created diagnostic scripts
- [ ] ❌ Set up Stripe Connect for Store ID: 1 (Jamaa online Market)
- [ ] ❌ Set up Stripe Connect for Store ID: 8 (Tech Haven Electronics)
- [ ] ❌ Set up Stripe Connect for Store ID: 9 (Urban Fashion Boutique)
- [ ] ❌ Set up Stripe Connect for Store ID: 10 (Cozy Home & Garden)

### Before Going Live
- [ ] Switch to live Stripe API keys
- [ ] Verify all stores have completed Stripe onboarding
- [ ] Test full checkout flow end-to-end
- [ ] Verify funds are correctly distributed to store accounts
- [ ] Set up webhook endpoints for payment confirmations

---

## 🚨 Common Issues

### "Refresh URL Expired"
If Stripe onboarding URL expires:
```bash
curl -X POST http://localhost:3001/api/stripe-connect/create-onboarding-link
```

### "Account Not Found"
Store needs to create account first:
```bash
curl -X POST http://localhost:3001/api/stripe-connect/create-account
```

### "Still Getting 500 Error"
1. Check backend logs for specific error
2. Run diagnostic: `node scripts/diagnoseCheckoutIssue.js`
3. Verify Stripe API keys are correct
4. Check all stores have `stripe_account_status = 'connected'`

---

## 📞 Support

**Diagnostic Scripts:**
- Check issues: `node scripts/diagnoseCheckoutIssue.js`
- Fix orphans: `node scripts/fixCheckoutIssues.js`

**Stripe Dashboard:**
- Test Mode: https://dashboard.stripe.com/test/dashboard
- Live Mode: https://dashboard.stripe.com/dashboard

**API Endpoints:**
- Create account: `POST /api/stripe-connect/create-account`
- Get status: `GET /api/stripe-connect/account-status`
- Create onboarding link: `POST /api/stripe-connect/create-onboarding-link`

---

## 🎯 Summary

**Root Cause**: No stores have Stripe Connect accounts set up

**Quick Fix**:
1. Log in as a store owner
2. Complete Stripe Connect onboarding
3. Test checkout again

**Expected Timeline**: 5-10 minutes per store for Stripe onboarding

**Once complete**: Checkout will work perfectly! ✅

---

**Last Updated**: January 21, 2026
**Status**: ✅ Orphaned products fixed, ❌ Stripe Connect needed
