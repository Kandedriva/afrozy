# Afrozy Market - Production Deployment Guide

## Overview
This guide outlines the steps to deploy Afrozy Market to a production environment using Docker containers with comprehensive security, monitoring, and backup features.

## Prerequisites

### System Requirements
- **Docker**: Version 20.0+ with Docker Compose
- **Node.js**: Version 18+ 
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: Minimum 20GB free space
- **Network**: Ports 80, 443 available for web traffic

### Required Tools
```bash
# Install required CLI tools
curl -fsSL https://get.docker.com | sh
npm install -g npm@latest
sudo apt-get update && sudo apt-get install -y jq curl
```

## Pre-Deployment Setup

### 1. Environment Configuration

Create your production environment file:
```bash
cp backend/.env.example .env.production
```

**Critical Environment Variables to Configure:**

```env
# Database (REQUIRED)
PGHOST=your_production_postgres_host
PGDATABASE=afrozy_market_prod
PGUSER=afrozy_user
PGPASSWORD=your_secure_database_password_32chars_min

# Security (REQUIRED) 
JWT_SECRET=your_extremely_secure_jwt_secret_minimum_64_characters_random_string
REDIS_PASSWORD=your_secure_redis_password

# Application URLs (REQUIRED)
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com  
API_URL=https://api.yourdomain.com

# Email (Production notifications)
SMTP_HOST=smtp.youremailprovider.com
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_email_app_password

# External Services
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
SENTRY_DSN=your_sentry_dsn_for_error_tracking
```

### 2. SSL Certificate Setup (HTTPS)

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your SSL certificates
cp yourdomain.com.crt nginx/ssl/cert.pem
cp yourdomain.com.key nginx/ssl/key.pem

# Set proper permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

### 3. Database Preparation

Ensure your PostgreSQL database is ready:
```sql
-- Connect to PostgreSQL and create database
CREATE DATABASE afrozy_market_prod;
CREATE USER afrozy_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE afrozy_market_prod TO afrozy_user;
```

## Deployment Process

### 1. Environment Validation

Validate your configuration before deployment:
```bash
# Run environment validation
node scripts/validate-env.js
```

This script checks:
- ✅ All required environment variables are set
- ✅ JWT secret is sufficiently long (64+ characters)
- ✅ Database connection parameters are present
- ✅ Security configurations are proper for production

### 2. Execute Deployment

Run the automated deployment script:
```bash
# Deploy to production
./deploy.sh
```

The deployment script will:
1. 🔍 Validate environment and dependencies
2. 🔨 Build React frontend and backend
3. 🐳 Build Docker images with production optimizations
4. 💾 Create database backup (if existing data)
5. 🚀 Deploy all services with health checks
6. 🏥 Perform comprehensive health validation
7. 📊 Display deployment status and resource usage

### 3. Deployment Verification

After deployment, verify services are running:
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View service logs
docker-compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl http://localhost/health
curl http://localhost/api/health
```

Expected healthy responses:
- **Frontend**: HTTP 200 from `http://localhost`
- **Backend**: JSON health status from `http://localhost/api/health`
- **Database**: Connection successful in health check

## Service Architecture

### Container Services

| Service | Port | Description | Health Check |
|---------|------|-------------|--------------|
| **nginx** | 80, 443 | Reverse proxy, static files | `nginx -t` |
| **frontend** | 3000 | React application | `curl /health` |
| **backend** | 3001 | Node.js API | `curl /health` |
| **database** | 5432 | PostgreSQL | `pg_isready` |
| **redis** | 6379 | Caching, sessions | `redis-cli ping` |

### Security Features

✅ **Network Security**
- Internal Docker network isolation
- External access only through nginx reverse proxy
- Rate limiting on API and auth endpoints

✅ **Application Security**
- Helmet.js security headers
- CORS protection with domain whitelist  
- JWT token authentication
- Password strength validation
- Input sanitization

✅ **Container Security**
- Non-root user execution
- Minimal Alpine Linux base images
- Read-only file systems where possible
- Resource limits and health checks

## Post-Deployment Tasks

### 1. SSL/HTTPS Configuration

Update nginx configuration for HTTPS:
```bash
# Edit nginx/prod.conf and uncomment SSL server block
# Update SSL certificate paths
# Restart nginx service
docker-compose -f docker-compose.prod.yml restart nginx
```

### 2. Domain and DNS Configuration

- Point your domain A records to server IP
- Configure CDN if using one
- Set up domain-based redirects

### 3. Monitoring Setup

```bash
# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f

# Monitor resource usage
docker stats

# Set up log rotation (add to crontab)
0 2 * * * docker system prune -f
```

### 4. Database Backup Configuration

Automatic backups are configured but verify:
```bash
# Check backup service
docker-compose -f docker-compose.prod.yml ps backup

# Manually trigger backup
docker-compose -f docker-compose.prod.yml exec backup pg_dump -h database -U afrozy_user afrozy_market_prod > backup_manual.sql
```

### 5. Security Hardening

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Configure firewall (if using ufw)
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Set up fail2ban for SSH protection
sudo apt install fail2ban
```

## Monitoring and Maintenance

### Application Monitoring

```bash
# Check service health
curl http://localhost/health
curl http://localhost/api/health

# View application logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# Monitor resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Database Monitoring

```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec database pg_isready

# Connect to database
docker-compose -f docker-compose.prod.yml exec database psql -U afrozy_user -d afrozy_market_prod

# Check database size
docker-compose -f docker-compose.prod.yml exec database psql -U afrozy_user -d afrozy_market_prod -c "SELECT pg_size_pretty(pg_database_size('afrozy_market_prod'));"
```

### Performance Optimization

```bash
# View container resource limits
docker inspect afrozy-backend-prod | jq '.[].HostConfig.Memory'

# Optimize database queries (monitor slow queries)
docker-compose -f docker-compose.prod.yml exec database psql -U afrozy_user -d afrozy_market_prod -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

## Backup and Recovery

### Backup Procedures

```bash
# Create full backup
timestamp=$(date +%Y%m%d_%H%M%S)
docker-compose -f docker-compose.prod.yml exec database pg_dump -U afrozy_user afrozy_market_prod > "database/backup/backup_${timestamp}.sql"

# Backup Docker volumes
docker run --rm -v afrozy-market_postgres_prod_data:/data -v $(pwd)/database/backup:/backup alpine tar czf /backup/volume_backup_${timestamp}.tar.gz -C /data .
```

### Recovery Procedures

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Restore database from backup
cat database/backup/backup_YYYYMMDD_HHMMSS.sql | docker-compose -f docker-compose.prod.yml exec -T database psql -U afrozy_user -d afrozy_market_prod

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

**1. Service Won't Start**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs service_name

# Check configuration
docker-compose -f docker-compose.prod.yml config
```

**2. Database Connection Issues**
```bash
# Verify database is running
docker-compose -f docker-compose.prod.yml ps database

# Test connection
docker-compose -f docker-compose.prod.yml exec database pg_isready -h localhost -U afrozy_user
```

**3. Frontend Not Loading**
```bash
# Check nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Verify build files exist
ls frontend/build/
```

**4. High Memory Usage**
```bash
# Check resource usage
docker stats

# Restart services if needed
docker-compose -f docker-compose.prod.yml restart
```

### Emergency Procedures

**Rolling Back Deployment**
```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Restore from backup
# (follow recovery procedures above)

# Deploy previous version
git checkout previous_commit
./deploy.sh
```

## Security Checklist

- [ ] All environment variables configured with strong values
- [ ] SSL certificates installed and configured
- [ ] Firewall configured to allow only necessary ports
- [ ] Database passwords are strong and unique
- [ ] JWT secret is cryptographically secure (64+ characters)
- [ ] CORS origins are restricted to your domain
- [ ] Rate limiting is enabled and tested
- [ ] Security headers are configured in nginx
- [ ] Regular backups are scheduled and tested
- [ ] Log rotation is configured
- [ ] Monitoring and alerting is set up
- [ ] All default passwords have been changed

## Support

For issues or questions:

1. Check logs: `docker-compose -f docker-compose.prod.yml logs`
2. Review this guide for troubleshooting steps
3. Verify environment configuration with validation script
4. Check service health endpoints

## Production URLs

After successful deployment:

- **Application**: http://yourdomain.com (or https:// if SSL configured)
- **API**: http://yourdomain.com/api
- **Health Check**: http://yourdomain.com/health
- **Admin Panel**: http://yourdomain.com/admin

---

**🎉 Congratulations! Your Afrozy Market application is now running in production.**

Remember to regularly update dependencies, monitor performance, and maintain backups for optimal production operation.