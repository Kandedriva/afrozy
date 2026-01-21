# Production Build Routing Fix

## Issues Fixed

### 1. ❌ "Uncaught SyntaxError: Unexpected token '<'" Error
**Cause**: This error occurs when the browser tries to execute HTML as JavaScript. In SPAs (Single Page Applications), when you directly navigate to a route like `/store/123`, the server looks for a file at that path. If not properly configured, it returns `index.html` but with the wrong Content-Type, causing the browser to try parsing HTML as JS.

**Fixed by**:
- Updated `frontend/nginx.conf` to properly handle SPA routing with `try_files $uri $uri/ /index.html`
- Reordered nginx location blocks so the catch-all `/` comes before specific asset rules
- Added proper caching headers

### 2. ❌ Manifest.json Syntax Error
**Cause**: The `start_url: "."` was causing issues in production builds.

**Fixed by**:
- Changed `start_url` from `"."` to `"/"` in `frontend/public/manifest.json`
- Updated `homepage` in `frontend/package.json` from `"."` to `"/"`

### 3. ❌ HTTPS localhost in fallback URLs
**Cause**: App.tsx had `https://localhost` which doesn't work

**Fixed by**:
- Changed all fallback URLs from `https://localhost:3001/api` to `http://localhost:3001/api`

## Files Modified

### 1. `frontend/nginx.conf`
```nginx
# Root directory
root /usr/share/nginx/html;
index index.html index.htm;

# Serve the React app - MUST come before static assets
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache";
}

# Cache static assets - More specific rules for built files
location ~* \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Why this works**:
- `try_files $uri $uri/ /index.html` tells nginx to try serving the file, then try it as a directory, and if neither exists, fall back to `index.html`
- This ensures all client-side routes (like `/store/123`) serve the React app, which then handles the routing

### 2. `frontend/public/manifest.json`
```json
{
  "start_url": "/"
}
```

### 3. `frontend/package.json`
```json
{
  "homepage": "/"
}
```

### 4. `frontend/src/App.tsx`
- Fixed API URL fallbacks to use `http://` instead of `https://` for localhost

### 5. New: `frontend/public/.htaccess`
Added Apache rewrite rules for deployments on Apache servers (like cPanel)

### 6. New: `frontend/test-production-build.sh`
Script to test production builds locally before deploying

## How to Test the Fix

### Option 1: Local Production Build Test
```bash
cd frontend
chmod +x test-production-build.sh
./test-production-build.sh
```

This will:
1. Build the production bundle
2. Show build statistics
3. Start a local server on port 5000
4. Test routes like `/store/1`, `/stores`, `/admin`

### Option 2: Docker Production Test
```bash
# Build and run production container
cd /Users/drissakande/afrozy
docker-compose -f docker-compose.prod.yml up --build frontend

# Test at http://localhost:3000
```

### Option 3: Full Production Stack
```bash
docker-compose -f docker-compose.prod.yml up --build
```

## Deployment Instructions

### For Netlify/Vercel (Already Configured)
The `netlify.toml` and `_redirects` files are already correctly configured:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Just push your changes and redeploy.

### For Docker/VPS Deployment
1. Rebuild the frontend image:
   ```bash
   docker-compose -f docker-compose.prod.yml build frontend
   ```

2. Restart the service:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d frontend
   ```

### For Manual nginx Deployment
1. Build the app:
   ```bash
   cd frontend
   npm run build
   ```

2. Copy build files:
   ```bash
   sudo cp -r build/* /usr/share/nginx/html/
   ```

3. Copy nginx config:
   ```bash
   sudo cp nginx.conf /etc/nginx/conf.d/afrozy.conf
   ```

4. Test and reload nginx:
   ```bash
   sudo nginx -t
   sudo nginx -s reload
   ```

## Common Issues and Solutions

### Issue: Still getting blank page after fix
**Solution**: Clear browser cache and hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

### Issue: 404 errors for static assets
**Solution**: Check that `homepage` in package.json is `"/"` not `"."` and rebuild

### Issue: API calls failing in production
**Solution**: Verify `REACT_APP_API_URL` in `.env.production` points to correct backend URL

### Issue: Works locally but not in production
**Solution**: Ensure your production server (nginx/Apache) is configured for SPA routing

## Environment Variables

### Frontend `.env.production`
```env
REACT_APP_API_URL=https://api.afrozy.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
GENERATE_SOURCEMAP=false
```

### Important Notes:
- API URL should include `/api` suffix (e.g., `https://api.afrozy.com/api`)
- HTTPS is required in production
- Never commit `.env.production` with secrets to git

## Browser Console Checks

After deploying, open browser DevTools and verify:

1. **Network Tab**:
   - JS/CSS files should return 200 status
   - Content-Type for JS files should be `application/javascript`
   - Content-Type for CSS files should be `text/css`

2. **Console Tab**:
   - No "Unexpected token '<'" errors
   - No "Failed to fetch" errors for API calls

3. **Application Tab**:
   - Manifest should load without errors
   - Service worker (if any) should register correctly

## Performance Verification

After fix, your Lighthouse scores should improve:
- **Performance**: 90+ (was affected by routing errors)
- **Best Practices**: 90+ (was affected by manifest errors)
- **SEO**: 90+
- **Accessibility**: 90+

## Rollback Plan

If issues persist, rollback with:
```bash
git checkout HEAD~1 frontend/nginx.conf
git checkout HEAD~1 frontend/package.json
git checkout HEAD~1 frontend/public/manifest.json
```

Then rebuild and redeploy.

## Support

If you encounter issues:
1. Check nginx error logs: `docker logs afrozy-frontend-prod`
2. Check browser console for specific errors
3. Verify network requests in DevTools
4. Test the production build locally first using the test script

## Summary

The root cause was **improper SPA routing configuration** in nginx. Modern SPAs use client-side routing, so ALL routes must serve `index.html` and let JavaScript handle navigation. The nginx configuration now properly supports this pattern.
