# SSL/HTTPS Configuration Guide

This document provides guidance for configuring SSL/HTTPS in your Jamaa Market application for enhanced security.

## Overview

All external-facing URLs in the application have been updated to use HTTPS. This document explains how to configure SSL certificates for production deployment.

## Updated Configuration

### Backend Security Configuration
- Updated CORS origins to prioritize HTTPS
- Modified Content Security Policy to use secure websockets (WSS)
- Updated default API URLs to HTTPS

### Frontend Configuration
- Updated all API base URLs to use HTTPS
- Modified axios defaults to use secure endpoints
- Updated hardcoded fetch URLs to HTTPS

### Docker & Production
- Updated client URLs in Docker Compose to use HTTPS
- Health checks remain HTTP for internal container communication

## Local Development Setup

For local development with HTTPS, you have several options:

### Option 1: Use mkcert (Recommended)

1. Install mkcert:
   ```bash
   # macOS
   brew install mkcert
   
   # Ubuntu/Debian
   sudo apt install mkcert
   
   # Windows (using Chocolatey)
   choco install mkcert
   ```

2. Create local certificates:
   ```bash
   mkcert -install
   mkcert localhost 127.0.0.1 ::1
   ```

3. Configure your development servers to use the generated certificates.

### Option 2: Use self-signed certificates

Generate certificates using OpenSSL:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout localhost.key -out localhost.crt \
  -subj "/CN=localhost"
```

### Option 3: Use development proxy

Use a tool like `local-ssl-proxy` or `https-proxy` to wrap your HTTP services with HTTPS.

## Production SSL Setup

### Using Let's Encrypt with Nginx

1. Install Certbot:
   ```bash
   sudo apt update
   sudo apt install certbot python3-certbot-nginx
   ```

2. Obtain SSL certificate:
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. Update Nginx configuration (sample):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name yourdomain.com www.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       # SSL Configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
       ssl_prefer_server_ciphers on;
       ssl_session_cache shared:SSL:10m;

       location / {
           proxy_pass http://frontend:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /api {
           proxy_pass http://backend:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

### Using Cloudflare SSL

1. Add your domain to Cloudflare
2. Enable SSL/TLS encryption mode (Full or Full Strict)
3. Configure origin certificates for end-to-end encryption

### AWS Application Load Balancer

1. Request SSL certificate from AWS Certificate Manager
2. Configure ALB with SSL listener on port 443
3. Redirect HTTP traffic to HTTPS

## Environment Variables

Update your environment files for production:

### Backend (.env)
```env
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
API_URL=https://yourdomain.com
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://yourdomain.com/api
```

## Security Headers

Ensure your application includes security headers:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https:"],
      // ... other directives
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Testing HTTPS Configuration

1. **SSL Certificate Validation**:
   ```bash
   openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
   ```

2. **Security Headers Check**:
   Use tools like [SSL Labs](https://www.ssllabs.com/ssltest/) or [Security Headers](https://securityheaders.com/)

3. **Mixed Content Check**:
   Open browser developer tools and check for mixed content warnings

## Troubleshooting

### Common Issues

1. **Mixed Content Errors**:
   - Ensure all resources (images, scripts, stylesheets) use HTTPS
   - Check for hardcoded HTTP URLs in your code

2. **Certificate Errors**:
   - Verify certificate chain is complete
   - Check certificate expiration date
   - Ensure domain name matches certificate

3. **CORS Issues**:
   - Update CORS configuration to include HTTPS origins
   - Verify credentials are properly configured

### Development Fallback

If you encounter issues with HTTPS in development, you can temporarily fallback to HTTP by updating the environment variables:

```env
# Development fallback
REACT_APP_API_URL=http://localhost:3001/api
CLIENT_URL=http://localhost:3000
```

## Best Practices

1. **Always use HTTPS in production**
2. **Redirect HTTP to HTTPS**
3. **Use HTTP Strict Transport Security (HSTS)**
4. **Keep certificates up to date**
5. **Use strong SSL/TLS configurations**
6. **Regularly audit security headers**
7. **Monitor certificate expiration**

## Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Transport Layer Protection](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)