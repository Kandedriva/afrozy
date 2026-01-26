# Deploy Image Upload Fix to Production

## Issue
Production server generates R2 storage URLs instead of CDN URLs:
```
❌ Production: https://d67b7e02...r2.cloudflarestorage.com/afrozy-images/products/...
✅ Development: https://cdn.afrozy.com/products/...
```

## Root Cause
Production server is running **old code** from before the r2.js fix was applied.

## Solution
Deploy the updated code to production.

---

## Deployment Steps

### Option 1: Docker Deployment (Recommended)

If you're using Docker for production:

```bash
# Navigate to project root
cd /Users/drissakande/afrozy

# Pull latest code (if needed)
git pull origin main

# Rebuild and restart production containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache backend
docker-compose -f docker-compose.prod.yml up -d

# Check logs to verify CDN URLs
docker-compose -f docker-compose.prod.yml logs -f backend
```

Look for this in logs:
```
✅ Using CDN URL: https://cdn.afrozy.com/products/...
   Public URL: https://cdn.afrozy.com
```

### Option 2: Direct Server Deployment

If you're deploying directly to a server:

```bash
# SSH into production server
ssh user@your-production-server

# Navigate to backend directory
cd /path/to/afrozy/backend

# Pull latest code
git pull origin main

# Restart the backend service
# Option A: Using PM2
pm2 restart afrozy-backend

# Option B: Using systemd
sudo systemctl restart afrozy-backend

# Option C: Manual restart
# Kill the old process and start new one
pkill -f "node.*server"
npm start
```

### Option 3: Platform-Specific Deployment

**For Vercel:**
```bash
vercel --prod
```

**For Heroku:**
```bash
git push heroku main
```

**For Railway:**
- Push to main branch (auto-deploys)
- Or trigger manual deploy in Railway dashboard

**For Render:**
- Push to main branch (auto-deploys)
- Or trigger manual deploy in Render dashboard

---

## Verification After Deployment

### Step 1: Check Backend Logs

Look for these log messages when images are uploaded:
```
✅ Using CDN URL: https://cdn.afrozy.com/products/...
   Public URL: https://cdn.afrozy.com
   Endpoint: https://d67b7e02...r2.cloudflarestorage.com
```

### Step 2: Test Image Upload

1. Go to production site: https://afrozy.com
2. Login as admin or store owner
3. Add a product with an image
4. **Check the image URL in the response**:
   - ✅ Should be: `https://cdn.afrozy.com/products/...`
   - ❌ Should NOT be: `https://d67b7e02...r2.cloudflarestorage.com/...`

### Step 3: Verify Image Displays

1. Product card should show the image
2. Image should load without errors
3. Check browser console - no 403/CORS errors

---

## Fix Existing Broken Images in Production

After deploying, fix images that were uploaded with R2 storage URLs:

```bash
# SSH into production server
ssh user@your-production-server

# Navigate to backend
cd /path/to/afrozy/backend

# Set production environment
export NODE_ENV=production

# Run migration script
node scripts/fixR2StorageUrlsToCdn.js
```

This will convert all existing R2 storage URLs to CDN URLs in the database.

---

## Environment Variables Checklist

Verify these are set in production (`.env.production` or hosting platform):

```bash
✓ R2_PUBLIC_URL=https://cdn.afrozy.com
✓ R2_BUCKET_NAME=afrozy-images
✓ R2_ACCOUNT_ID=d67b7e02209c84271845bf9179e2be37
✓ R2_ACCESS_KEY_ID=dd20555d204702b91ee5d9f64dd57350
✓ R2_SECRET_ACCESS_KEY=f0886b0311ce602bb13fb25f6321012c0a8f76789e8b48f68948355d4596e355
```

All these are already correctly set in `.env.production`.

---

## Files Changed (Already Committed)

These files contain the fix and are ready to deploy:

1. ✅ `backend/config/r2.js` - Fixed URL generation
2. ✅ `backend/scripts/fixR2StorageUrlsToCdn.js` - Migration script
3. ✅ `.env.production` - Already has correct config

---

## Quick Deploy Command

For Docker deployment:
```bash
cd /Users/drissakande/afrozy && \
docker-compose -f docker-compose.prod.yml down && \
docker-compose -f docker-compose.prod.yml build --no-cache backend && \
docker-compose -f docker-compose.prod.yml up -d && \
docker-compose -f docker-compose.prod.yml logs -f backend
```

---

## Troubleshooting

### Problem: Still seeing R2 storage URLs

**Cause**: Old Docker image cached or server not restarted

**Solution**:
```bash
# Force rebuild without cache
docker-compose -f docker-compose.prod.yml build --no-cache backend
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### Problem: Images still don't display

**Cause**: Database still has old R2 storage URLs

**Solution**: Run the migration script
```bash
docker-compose -f docker-compose.prod.yml exec backend node scripts/fixR2StorageUrlsToCdn.js
```

---

## Summary

1. ✅ Code is fixed and committed to `main` branch
2. ✅ Environment variables are correct in `.env.production`
3. ✅ Migration script ready to fix old URLs
4. ⚠️ **Production server needs deployment/restart**

**Action Required**: Deploy the latest code to production using one of the methods above.

After deployment, new image uploads will use:
```
✅ https://cdn.afrozy.com/products/...
```

Instead of:
```
❌ https://d67b7e02...r2.cloudflarestorage.com/afrozy-images/products/...
```
