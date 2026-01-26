# Production Deployment Verification

## Status
✅ **Deployed to Render**

## What to Test

### Test 1: Upload New Product Image in Production

1. Go to your production site: **https://afrozy.com**
2. Login as **Admin** or **Store Owner**
3. Navigate to "Add Product" page
4. Upload a new product image
5. **Before clicking "Add Product"**, check the image preview URL

**Expected Result**:
```
✅ Should show: https://cdn.afrozy.com/products/[timestamp]_[hash]_[filename].webp
❌ Should NOT show: https://d67b7e02...r2.cloudflarestorage.com/afrozy-images/products/...
```

### Test 2: Verify Image Displays

1. Complete adding the product
2. View the product in the marketplace
3. Image should display correctly on the product card
4. Click on the product to view details
5. Image should display on the product details page

**Expected Result**:
- ✅ Image loads without errors
- ✅ No 403 or CORS errors in browser console
- ✅ Image URL in database is: `https://cdn.afrozy.com/products/...`

### Test 3: Check Render Deployment Logs

1. Go to Render Dashboard
2. Select your backend service
3. Click on "Logs" tab
4. Upload a test product image
5. Check logs for these messages:

**Expected Log Output**:
```
✅ Using CDN URL: https://cdn.afrozy.com/products/...
   Public URL: https://cdn.afrozy.com
   Endpoint: https://d67b7e02209c84271845bf9179e2be37.r2.cloudflarestorage.com
```

---

## If Production Still Shows R2 Storage URLs

### Option 1: Force Redeploy on Render

1. Go to Render Dashboard
2. Select your backend service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for deployment to complete
5. Test image upload again

### Option 2: Check Environment Variables

Verify these are set in Render Dashboard → Environment:

```bash
R2_PUBLIC_URL=https://cdn.afrozy.com
R2_BUCKET_NAME=afrozy-images
R2_ACCOUNT_ID=d67b7e02209c84271845bf9179e2be37
R2_ACCESS_KEY_ID=dd20555d204702b91ee5d9f64dd57350
R2_SECRET_ACCESS_KEY=f0886b0311ce602bb13fb25f6321012c0a8f76789e8b48f68948355d4596e355
```

### Option 3: Check Render Build Command

Ensure Render is using the correct build command:
- **Build Command**: `npm install`
- **Start Command**: `npm start` or `node server.js`

---

## Fix Existing Broken Images (If Needed)

If you have products in production with old R2 storage URLs, run the migration script:

### Via Render Shell

1. Go to Render Dashboard
2. Select your backend service
3. Click "Shell" tab
4. Run the migration script:

```bash
node scripts/fixR2StorageUrlsToCdn.js
```

**Expected Output**:
```
🔍 Searching for products with R2 storage URLs...
✅ Found X products with R2 storage URLs

Processing:
  ✓ Product #15: Updated to https://cdn.afrozy.com/products/...
  ✓ Product #18: Updated to https://cdn.afrozy.com/products/...

✅ Migration complete: X products updated
```

---

## Verification Checklist

After deployment, verify:

- [ ] New image uploads generate CDN URLs: `https://cdn.afrozy.com/products/...`
- [ ] Images display correctly on product cards
- [ ] Images display correctly on product details page
- [ ] No 403 or CORS errors in browser console
- [ ] Backend logs show "Using CDN URL" messages
- [ ] Store name displays for store owner products
- [ ] "Visit Store" button works and navigates to store page
- [ ] Admin products do NOT show store name

---

## Quick Test Commands

### Check if a specific product has correct URL
```bash
# Via Render Shell
node -e "const { pool } = require('./config/database'); (async () => { const res = await pool.query('SELECT id, name, image_url FROM products ORDER BY created_at DESC LIMIT 5'); console.log(res.rows); await pool.end(); })()"
```

### Check R2 configuration in production
```bash
# Via Render Shell
echo "R2_PUBLIC_URL=$R2_PUBLIC_URL"
echo "R2_BUCKET_NAME=$R2_BUCKET_NAME"
```

---

## Success Criteria

Your production deployment is successful when:

1. ✅ New uploads show: `https://cdn.afrozy.com/products/...`
2. ✅ Images display correctly without CORS errors
3. ✅ Store information shows correctly on products
4. ✅ "Visit Store" button navigates successfully

---

**Last Updated**: January 26, 2026
**Deployment**: Render
**Branch**: main (commit 10d73b3)
