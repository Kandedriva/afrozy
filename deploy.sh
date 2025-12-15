#!/bin/bash
set -euo pipefail

# Production Deployment Script for Afrozy Market
echo "🚀 Starting Afrozy Market Production Deployment"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="afrozy-market"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./database/backup"
LOG_FILE="deploy.log"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
log "🔍 Running pre-deployment checks..."

# Check if required commands are available
for cmd in docker docker-compose node npm jq; do
    if ! command -v "$cmd" &> /dev/null; then
        error "$cmd is not installed or not in PATH"
    fi
done

# Check if .env.production exists
if [[ ! -f "$ENV_FILE" ]]; then
    error "$ENV_FILE file not found. Please create it with production configuration."
fi

# Load environment variables
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Validate environment variables using our validation script
log "📋 Validating environment configuration..."
node scripts/validate-env.js || error "Environment validation failed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    error "Docker is not running. Please start Docker and try again."
fi

# Create necessary directories
log "📁 Creating required directories..."
mkdir -p "$BACKUP_DIR"
mkdir -p backend/logs
mkdir -p nginx/ssl
mkdir -p nginx/logs

# Build application
log "🔨 Building application..."

# Frontend build
log "Building React frontend..."
cd frontend
npm ci --only=production
npm run build
cd ..

# Check if build was successful
if [[ ! -d "frontend/build" ]]; then
    error "Frontend build failed - build directory not found"
fi

# Backend dependencies check
log "Installing backend dependencies..."
cd backend
npm ci --only=production
cd ..

# Docker build and deploy
log "🐳 Building and deploying with Docker..."

# Pull latest base images
docker-compose -f "$COMPOSE_FILE" pull

# Build images
docker-compose -f "$COMPOSE_FILE" build --no-cache

# Stop existing containers
log "🛑 Stopping existing containers..."
docker-compose -f "$COMPOSE_FILE" down --remove-orphans

# Database backup (if database exists)
if docker ps -a | grep -q "$PROJECT_NAME-db"; then
    log "💾 Creating database backup..."
    timestamp=$(date +%Y%m%d_%H%M%S)
    docker exec "$PROJECT_NAME-db-prod" pg_dump -U "${PGUSER:-afrozy_user}" "${PGDATABASE:-afrozy_market_prod}" > "${BACKUP_DIR}/pre_deploy_backup_${timestamp}.sql" || warning "Database backup failed"
fi

# Start services
log "🚀 Starting production services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be ready
log "⏳ Waiting for services to be ready..."
sleep 30

# Health checks
log "🏥 Performing health checks..."

# Check backend health
backend_health=$(curl -s http://localhost:3001/health | jq -r .status 2>/dev/null || echo "UNKNOWN")
if [[ "$backend_health" != "OK" ]]; then
    error "Backend health check failed: $backend_health"
fi

# Check frontend accessibility
if ! curl -s http://localhost:80 > /dev/null; then
    error "Frontend is not accessible"
fi

# Display container status
log "📊 Container Status:"
docker-compose -f "$COMPOSE_FILE" ps

# Display resource usage
log "📈 Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Final checks and cleanup
log "🧹 Performing cleanup..."

# Remove old images
docker image prune -f

# Show logs for any failed containers
for service in backend frontend database nginx redis; do
    if ! docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
        warning "Service $service is not running. Checking logs..."
        docker-compose -f "$COMPOSE_FILE" logs --tail=20 "$service"
    fi
done

log "✅ Deployment completed successfully!"
log "🌐 Application is available at:"
log "   - Frontend: http://localhost"
log "   - API: http://localhost/api"
log "   - Health Check: http://localhost/health"

log "📝 Deployment Details:"
log "   - Environment: $NODE_ENV"
log "   - Version: $(node -p 'require("./backend/package.json").version')"
log "   - Deployed at: $(date)"
log "   - Log file: $LOG_FILE"

echo ""
echo "🎉 Afrozy Market is now running in production!"
echo "📊 Monitor with: docker-compose -f docker-compose.prod.yml logs -f"

# Post-deployment checklist
echo ""
warning "⚠️  Post-deployment checklist:"
echo "  1. 🔐 Configure SSL certificates in ./nginx/ssl/"
echo "  2. 🌐 Update DNS records to point to your server"
echo "  3. 📊 Set up monitoring and alerting"
echo "  4. 💾 Configure automated backups"
echo "  5. 📝 Set up log rotation"
echo "  6. 🔒 Review security settings"
echo "  7. 🚀 Test all application features"
echo "  8. 📧 Configure email notifications"