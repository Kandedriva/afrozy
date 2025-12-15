#!/bin/bash

# SSL and Production Configuration Validation Script
# Validates SSL certificates, nginx configuration, and environment variables

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SSL_DIR="nginx/ssl"
ENV_FILE=".env.production"

echo -e "${BLUE}🔍 SSL and Production Configuration Validation${NC}"
echo "=============================================="

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Validation counters
ERRORS=0
WARNINGS=0

# 1. Validate SSL certificates
log "🔒 Validating SSL certificates..."

if [[ -f "$SSL_DIR/cert.pem" && -f "$SSL_DIR/key.pem" ]]; then
    # Check certificate validity
    if openssl x509 -in "$SSL_DIR/cert.pem" -noout -checkend 86400; then
        success "SSL certificate is valid and not expiring within 24 hours"
    else
        warning "SSL certificate is expiring within 24 hours or invalid"
        ((WARNINGS++))
    fi
    
    # Check certificate and key match
    CERT_HASH=$(openssl x509 -noout -modulus -in "$SSL_DIR/cert.pem" | openssl md5)
    KEY_HASH=$(openssl rsa -noout -modulus -in "$SSL_DIR/key.pem" | openssl md5)
    
    if [[ "$CERT_HASH" == "$KEY_HASH" ]]; then
        success "SSL certificate and private key match"
    else
        error "SSL certificate and private key do not match"
        ((ERRORS++))
    fi
    
    # Check certificate information
    info "Certificate Details:"
    openssl x509 -in "$SSL_DIR/cert.pem" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:|DNS:)" | sed 's/^/  /'
    
    # Check file permissions
    CERT_PERMS=$(stat -f "%A" "$SSL_DIR/cert.pem" 2>/dev/null || stat -c "%a" "$SSL_DIR/cert.pem" 2>/dev/null)
    KEY_PERMS=$(stat -f "%A" "$SSL_DIR/key.pem" 2>/dev/null || stat -c "%a" "$SSL_DIR/key.pem" 2>/dev/null)
    
    if [[ "$CERT_PERMS" == "644" ]]; then
        success "Certificate file permissions are correct (644)"
    else
        warning "Certificate file permissions should be 644, found: $CERT_PERMS"
        ((WARNINGS++))
    fi
    
    if [[ "$KEY_PERMS" == "600" ]]; then
        success "Private key file permissions are correct (600)"
    else
        error "Private key file permissions should be 600, found: $KEY_PERMS"
        ((ERRORS++))
    fi
else
    error "SSL certificate files not found in $SSL_DIR/"
    error "Expected files: cert.pem, key.pem"
    ((ERRORS++))
fi

# 2. Validate nginx configuration
log "🔧 Validating nginx configuration..."

if [[ -f "nginx/prod.conf" ]]; then
    # Check for HTTPS configuration
    if grep -q "listen 443 ssl" "nginx/prod.conf"; then
        success "HTTPS is enabled in nginx configuration"
    else
        error "HTTPS is not enabled in nginx configuration"
        ((ERRORS++))
    fi
    
    # Check for HTTP to HTTPS redirect
    if grep -q "return 301 https" "nginx/prod.conf"; then
        success "HTTP to HTTPS redirect is configured"
    else
        warning "HTTP to HTTPS redirect not found"
        ((WARNINGS++))
    fi
    
    # Check for security headers
    if grep -q "Strict-Transport-Security" "nginx/prod.conf"; then
        success "HSTS security header is configured"
    else
        warning "HSTS security header not found"
        ((WARNINGS++))
    fi
    
    # Check SSL protocols
    if grep -q "TLSv1.3" "nginx/prod.conf"; then
        success "TLS 1.3 is enabled"
    else
        warning "TLS 1.3 not found in configuration"
        ((WARNINGS++))
    fi
    
    # Syntax check (if nginx is available)
    if command -v nginx &> /dev/null; then
        if nginx -t -c "$(pwd)/nginx/prod.conf" &> /dev/null; then
            success "Nginx configuration syntax is valid"
        else
            error "Nginx configuration has syntax errors"
            ((ERRORS++))
        fi
    else
        info "Nginx not available for syntax checking"
    fi
else
    error "Nginx configuration file not found: nginx/prod.conf"
    ((ERRORS++))
fi

# 3. Validate environment variables
log "🔐 Validating environment variables..."

if [[ -f "$ENV_FILE" ]]; then
    # Source the environment file
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    
    # Check required variables
    REQUIRED_VARS=("SESSION_SECRET" "PGPASSWORD" "REDIS_PASSWORD" "NODE_ENV")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [[ -n "${!var:-}" ]]; then
            # Check secret length for security variables
            VAR_VALUE="${!var}"
            case $var in
                "SESSION_SECRET")
                    if [[ ${#VAR_VALUE} -ge 32 ]]; then
                        success "$var is set with adequate length (${#VAR_VALUE} chars)"
                    else
                        warning "$var should be at least 32 characters (found: ${#VAR_VALUE})"
                        ((WARNINGS++))
                    fi
                    ;;
                "NODE_ENV")
                    if [[ "$VAR_VALUE" == "production" ]]; then
                        success "$var is set to production"
                    else
                        warning "$var is set to '$VAR_VALUE', should be 'production' for production deployment"
                        ((WARNINGS++))
                    fi
                    ;;
                *)
                    success "$var is set"
                    ;;
            esac
        else
            error "$var is not set"
            ((ERRORS++))
        fi
    done
    
    # Check URL configurations
    URL_VARS=("CLIENT_URL" "FRONTEND_URL" "API_URL")
    for var in "${URL_VARS[@]}"; do
        if [[ -n "${!var:-}" ]]; then
            VAR_VALUE="${!var}"
            if [[ "$VAR_VALUE" =~ ^https:// ]]; then
                success "$var uses HTTPS: $VAR_VALUE"
            else
                warning "$var should use HTTPS: $VAR_VALUE"
                ((WARNINGS++))
            fi
        else
            warning "$var is not set"
            ((WARNINGS++))
        fi
    done
    
    # Check for placeholder values
    if grep -q "jamaamarket.com" "$ENV_FILE"; then
        warning "Found placeholder domain 'jamaamarket.com' - update with your actual domain"
        ((WARNINGS++))
    fi
    
    if grep -q "your_" "$ENV_FILE"; then
        warning "Found placeholder values starting with 'your_' - update with actual values"
        ((WARNINGS++))
    fi
    
else
    error "Environment file not found: $ENV_FILE"
    ((ERRORS++))
fi

# 4. Validate Docker configuration
log "🐳 Validating Docker configuration..."

if [[ -f "docker-compose.prod.yml" ]]; then
    # Check SSL volume mounts
    if grep -q "nginx/ssl:/etc/nginx/ssl" "docker-compose.prod.yml"; then
        success "SSL certificates are mounted in Docker configuration"
    else
        warning "SSL certificate mount not found in Docker configuration"
        ((WARNINGS++))
    fi
    
    # Check environment file reference
    if grep -q ".env.production" "docker-compose.prod.yml" || grep -q "env_file" "docker-compose.prod.yml"; then
        success "Environment file is referenced in Docker configuration"
    else
        warning "Environment file reference not found in Docker configuration"
        ((WARNINGS++))
    fi
else
    error "Docker Compose production file not found: docker-compose.prod.yml"
    ((ERRORS++))
fi

# 5. Additional security checks
log "🛡️ Running additional security checks..."

# Check for exposed secrets in git
if git status &> /dev/null; then
    if git ls-files | grep -E "\.(env|key|pem|p12|pfx)$" | grep -v ".env.example"; then
        error "Potential secret files are tracked in git"
        ((ERRORS++))
    else
        success "No secret files found in git tracking"
    fi
fi

# Summary
echo
log "📊 Validation Summary:"
echo "  ✅ Checks passed"
echo "  ⚠️  Warnings: $WARNINGS"
echo "  ❌ Errors: $ERRORS"

if [[ $ERRORS -eq 0 ]]; then
    if [[ $WARNINGS -eq 0 ]]; then
        success "🎉 All validations passed! Your application is ready for production deployment."
    else
        warning "⚠️  Validation completed with $WARNINGS warnings. Review and address warnings before production deployment."
    fi
    exit 0
else
    error "❌ Validation failed with $ERRORS errors. Fix all errors before proceeding with deployment."
    exit 1
fi