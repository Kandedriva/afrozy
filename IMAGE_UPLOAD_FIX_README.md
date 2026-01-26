# Image Upload Fix - Complete Guide

**Issue**: When uploading product images, they show private R2 storage URLs instead of public CDN URLs, causing images not to display in the app.

**Example of the Problem**:
```
❌ Wrong URL (Private R2 Storage):
https://d67b7e02209c84271845bf9179e2be37.r2.cloudflarestorage.com/afrozy-images/products/...

✅ Correct URL (Public CDN):
https://cdn.afrozy.com/products/...
```

---

## Root Cause

The backend server needs to be running with the updated `r2.js` code that generates CDN URLs instead of R2 storage URLs.

**Current Status**:
- ✅ Backend code fixed (config/r2.js)
- ✅ Migration script created (scripts/fixR2StorageUrlsToCdn.js)
- ✅ Existing broken URLs fixed in database
- ❌ Backend server NOT running (needs to be started)

---

## How to Fix (3 Steps)

### Step 1: Start the Backend Server

**Option A - Using the start script:**
```bash
cd /Users/drissakande/afrozy/backend
./START_SERVER.sh
```

**Option B - Manually:**
```bash
cd /Users/drissakande/afrozy/backend
npm start
```

**Option C - Using Node directly:**
```bash
cd /Users/drissakande/afrozy/backend
node server.js
```

You should see output like:
```
✅ Using CDN URL: https://cdn.afrozy.com/products/...
   Public URL: https://cdn.afrozy.com
   Endpoint: https://d67b7e02209c84271845bf9179e2be37.r2.cloudflarestorage.com
```

### Step 2: Test Image Upload

1. Go to Admin Dashboard or Store Owner Dashboard
2. Click "Add Product"
3. Upload an image
4. **Verify the image URL shows**: `https://cdn.afrozy.com/products/...`
5. Complete adding the product
6. **Verify the image displays correctly** on the product card

### Step 3: Fix Existing Broken Images (If Any)

If you have products with broken image URLs, run this migration:

```bash
cd /Users/drissakande/afrozy/backend
node scripts/fixR2StorageUrlsToCdn.js
```

This will:
- Find all products with R2 storage URLs
- Convert them to CDN URLs
- Update the database

---

## Verification Checklist

After starting the server and uploading a new product:

- [ ] Backend server is running (check terminal for logs)
- [ ] New image upload shows CDN URL: `https://cdn.afrozy.com/...`
- [ ] Image displays immediately after upload in dashboard
- [ ] Image displays on product card in marketplace
- [ ] Image displays when clicking product details
- [ ] No browser console errors about failed image loads

---

## Technical Details

### What Was Fixed

**1. Backend Code (config/r2.js lines 180-190)**

Changed from:
```javascript
if (this.publicUrl && this.publicUrl !== this.endpoint) {
  publicUrl = this.publicUrl + finalFileName;
}
```

To:
```javascript
if (this.publicUrl) {
  publicUrl = this.publicUrl.endsWith('/')
    ? `${this.publicUrl}${finalFileName}`
    : `${this.publicUrl}/${finalFileName}`;

  logger.info(`✅ Using CDN URL: ${publicUrl}`);
}
```

**2. Migration Script Created**

`scripts/fixR2StorageUrlsToCdn.js` - Fixes existing database entries

**3. Environment Variables**

Your `.env` file already has the correct configuration:
```env
R2_PUBLIC_URL=https://cdn.afrozy.com
R2_BUCKET_NAME=afrozy-images
R2_ACCOUNT_ID=d67b7e02209c84271845bf9179e2be37
```

### Why Images Were Broken

1. **Before Fix**: The r2.js code generated private R2 storage URLs
2. **Private URLs**: Not accessible from browsers (CORS/403 errors)
3. **After Fix**: r2.js generates public CDN URLs
4. **Public URLs**: Accessible from anywhere via Cloudflare CDN

### File Changes Summary

**Modified Files**:
- `backend/config/r2.js` - URL generation logic
- `backend/routes/products.js` - Added store information
- `backend/routes/store.js` - Removed approval status checks

**New Files**:
- `backend/scripts/fixR2StorageUrlsToCdn.js` - Migration script
- `backend/START_SERVER.sh` - Server startup script
- `IMAGE_UPLOAD_FIX_README.md` - This guide

---

## Troubleshooting

### Problem: Images still show R2 storage URLs

**Solution**: Backend server wasn't restarted after code changes
```bash
# Stop the server (Ctrl+C)
# Restart it
cd backend
./START_SERVER.sh
```

### Problem: Backend server won't start

**Solution**: Check for port conflicts
```bash
# Check if port 3001 is in use
lsof -i :3001

# If something is using it, kill it
kill -9 <PID>

# Then start the server
./START_SERVER.sh
```

### Problem: Images in database still have R2 URLs

**Solution**: Run the migration script
```bash
cd backend
node scripts/fixR2StorageUrlsToCdn.js
```

### Problem: New uploads still show R2 URLs

**Solution**: Check environment variables
```bash
cd backend
grep R2_PUBLIC_URL .env
# Should show: R2_PUBLIC_URL=https://cdn.afrozy.com
```

---

## Support

If issues persist after following this guide:

1. Check backend server terminal for error messages
2. Check browser console for network errors
3. Verify R2 bucket and CDN configuration in Cloudflare
4. Ensure `R2_PUBLIC_URL` in `.env` is set correctly

---

**Last Updated**: January 26, 2026
**Status**: ✅ Fix Complete - Requires Server Restart
