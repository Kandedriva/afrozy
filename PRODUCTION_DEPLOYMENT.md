# Afrozy Production Deployment Guide

## 🎯 Overview
This guide covers deploying Afrozy to production with proper R2 CDN image handling.

---

## 📋 Prerequisites

- [ ] Server with Docker and Docker Compose installed
- [ ] Domain configured (afrozy.com)
- [ ] Cloudflare account with R2 enabled
- [ ] Neon PostgreSQL database (already configured)
- [ ] SSL certificates (Let's Encrypt or Cloudflare)

---

## 🔧 Step 1: Configure Cloudflare R2 Public Domain

### Option A: Custom Domain (Recommended for Production)

1. **Login to Cloudflare Dashboard**
   - Navigate to R2 Object Storage
   - Click on your bucket: `afrozy-images`

2. **Connect Custom Domain**
   - Go to "Settings" tab
   - Under "Public Access", click "Connect Domain"
   - Enter: `cdn.afrozy.com`
   - Click "Connect Domain"

3. **Cloudflare will automatically:**
   - Create the necessary DNS records
   - Set up the custom domain mapping
   - Enable HTTPS/SSL

4. **Wait for propagation** (usually 5-10 minutes)
   - Test by visiting: `https://cdn.afrozy.com/` (should show R2 bucket)

### Option B: Use R2.dev Subdomain (Quick Alternative)

1. In bucket settings, enable "Public URL access"
2. You'll get a URL like: `https://pub-xxxxxxxxxxxxxx.r2.dev`
3. Update `.env.production` with this URL instead of `cdn.afrozy.com`

---

## 🔐 Step 2: Configure Production Environment

The `.env.production` file has been pre-configured with R2 settings:

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=afrozy-images
R2_PUBLIC_URL=https://cdn.afrozy.com
```

### Important: Update These Values

1. **If using R2.dev subdomain:**
   ```bash
   R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxx.r2.dev
   ```

2. **Update Stripe keys to production:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_your_actual_live_key
   STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_live_key
   ```

3. **Verify domain settings:**
   ```bash
   CLIENT_URL=https://afrozy.com
   API_BASE_URL=https://api.afrozy.com
   ```

---

## 🚀 Step 3: Deploy to Production

### Method 1: Using Deploy Script (Recommended)

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### Method 2: Manual Docker Deployment

```bash
# Build frontend
cd frontend
npm ci --only=production
npm run build
cd ..

# Build and start services
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

---

## 🔄 Step 4: Migrate Existing Image URLs

If you have existing products with old proxy URLs, run the migration script:

```bash
# SSH into your production server
cd /path/to/afrozy

# Run the migration script
node backend/scripts/fixProxyUrlsToCdn.js
```

This will convert URLs from:
```
https://api.afrozy.com/api/images/proxy/products/file.webp
```

To:
```
https://cdn.afrozy.com/products/file.webp
```

---

## ✅ Step 5: Verify Deployment

### 1. Check Service Health

```bash
# Backend health check
curl https://api.afrozy.com/health

# Expected response:
# {"status":"OK","timestamp":"...","database":"connected"}
```

### 2. Test Image Upload

1. Login to admin panel
2. Create a new product
3. Upload an image
4. Check the database:

```bash
# Connect to production database
docker exec -it afrozy-backend-prod sh
node -e "
const { pool } = require('./config/database');
pool.query('SELECT id, name, image_url FROM products ORDER BY created_at DESC LIMIT 1')
  .then(r => console.log(r.rows))
  .then(() => pool.end());
"
```

5. Verify the image URL starts with `https://cdn.afrozy.com/`

### 3. Test Image Display

1. Visit your products page
2. Verify images load correctly
3. Check browser console for errors
4. Test image loading speed

---

## 🔧 Troubleshooting

### Images Not Displaying

**Check 1: Verify R2 Public URL**
```bash
curl -I https://cdn.afrozy.com/products/test.webp
# Should return 200 OK (or 404 if file doesn't exist, not 403)
```

**Check 2: Verify Backend Configuration**
```bash
docker exec afrozy-backend-prod sh -c 'echo $R2_PUBLIC_URL'
# Should output: https://cdn.afrozy.com
```

**Check 3: Check Backend Logs**
```bash
docker-compose -f docker-compose.prod.yml logs -f backend | grep "CDN"
# Look for: "Using direct CDN URL: https://cdn.afrozy.com/..."
```

### Images Still Using Proxy URLs

**Solution: Run migration script**
```bash
node backend/scripts/fixProxyUrlsToCdn.js
```

### Custom Domain Not Working

**Solution: Check Cloudflare DNS**
1. Go to Cloudflare DNS settings
2. Verify `cdn.afrozy.com` CNAME record exists
3. Ensure it points to your R2 bucket
4. Wait for DNS propagation (up to 48 hours, usually 5-10 minutes)

---

## 📊 Monitoring

### Check Image Upload Logs

```bash
# View backend logs for image uploads
docker-compose -f docker-compose.prod.yml logs -f backend | grep "Image uploaded"
```

### Monitor R2 Storage

1. Go to Cloudflare R2 Dashboard
2. Click on `afrozy-images` bucket
3. View storage metrics and bandwidth usage

---

## 🔐 Security Best Practices

### 1. CORS Configuration

Ensure your R2 bucket has proper CORS settings in Cloudflare:

```json
{
  "AllowedOrigins": ["https://afrozy.com"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["*"],
  "MaxAgeSeconds": 3600
}
```

### 2. SSL/TLS

- Ensure `cdn.afrozy.com` has SSL enabled (automatic with Cloudflare)
- Use HTTPS for all image URLs

### 3. Access Control

- Keep R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY secure
- Never commit `.env.production` to version control
- Rotate keys periodically

---

## 📝 Post-Deployment Checklist

- [ ] Cloudflare R2 custom domain (`cdn.afrozy.com`) is configured and accessible
- [ ] `.env.production` has correct R2_PUBLIC_URL
- [ ] Docker containers are running (`docker ps`)
- [ ] Backend health check passes
- [ ] New image uploads generate CDN URLs (not proxy URLs)
- [ ] Existing images migrated to CDN URLs
- [ ] Images display correctly on frontend
- [ ] SSL/HTTPS working on cdn.afrozy.com
- [ ] Monitoring and logging configured
- [ ] Backup strategy in place

---

## 🆘 Support

If you encounter issues:

1. Check backend logs: `docker-compose -f docker-compose.prod.yml logs -f backend`
2. Verify environment variables: `docker exec afrozy-backend-prod env | grep R2`
3. Test R2 connectivity: `docker exec afrozy-backend-prod sh -c 'curl -I https://cdn.afrozy.com'`

---

## 📚 Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Custom Domain Setup](https://developers.cloudflare.com/r2/buckets/public-buckets/#custom-domains)
- [Docker Compose Production Guide](https://docs.docker.com/compose/production/)

---

**Last Updated:** January 5, 2026  
**Version:** 1.0.0
