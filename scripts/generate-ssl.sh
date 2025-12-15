#!/bin/bash

# SSL Certificate Generation Script for Jamaa Market
# This script provides multiple options for SSL certificate setup

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SSL_DIR="../nginx/ssl"
DOMAIN="jamaamarket.com"

echo -e "${BLUE}🔒 SSL Certificate Setup for Jamaa Market${NC}"
echo "============================================"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Ensure SSL directory exists
mkdir -p "$SSL_DIR"

echo
echo "Choose SSL certificate setup option:"
echo "1. Generate self-signed certificate (development/testing)"
echo "2. Prepare for Let's Encrypt certificate (production)"
echo "3. Use existing certificate files"
echo "4. Generate certificate signing request (CSR) for CA"
echo

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        log "Generating self-signed certificate for development..."
        
        # Generate private key
        openssl genrsa -out "$SSL_DIR/key.pem" 2048
        
        # Generate certificate signing request
        openssl req -new -key "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.csr" -subj "/C=US/ST=State/L=City/O=JamaaMarket/OU=IT/CN=$DOMAIN/emailAddress=admin@$DOMAIN"
        
        # Generate self-signed certificate
        openssl x509 -req -days 365 -in "$SSL_DIR/cert.csr" -signkey "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" \
            -extensions v3_req -extfile <(
                echo '[v3_req]'
                echo 'keyUsage = keyEncipherment, dataEncipherment'
                echo 'extendedKeyUsage = serverAuth'
                echo "subjectAltName = DNS:$DOMAIN,DNS:www.$DOMAIN,DNS:api.$DOMAIN,DNS:localhost"
            )
        
        # Set proper permissions
        chmod 600 "$SSL_DIR/key.pem"
        chmod 644 "$SSL_DIR/cert.pem"
        
        log "✅ Self-signed certificate generated successfully!"
        warning "This certificate is for development only. Browsers will show security warnings."
        ;;
        
    2)
        log "Setting up Let's Encrypt certificate preparation..."
        
        # Create temporary certificate for initial setup
        openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
            -keyout "$SSL_DIR/key.pem" \
            -out "$SSL_DIR/cert.pem" \
            -subj "/CN=$DOMAIN"
        
        # Set proper permissions
        chmod 600 "$SSL_DIR/key.pem"
        chmod 644 "$SSL_DIR/cert.pem"
        
        cat << EOF > "$SSL_DIR/setup-letsencrypt.sh"
#!/bin/bash
# Let's Encrypt SSL Certificate Setup
# Run this script on your production server

# Install certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Generate Let's Encrypt certificate
sudo certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN \\
    --email admin@$DOMAIN --agree-tos --no-eff-email

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/key.pem

# Set proper permissions
sudo chown \$(whoami):\$(whoami) nginx/ssl/cert.pem nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
chmod 600 nginx/ssl/key.pem

# Restart nginx
docker-compose -f docker-compose.prod.yml start nginx

echo "✅ Let's Encrypt certificate configured!"
EOF
        
        chmod +x "$SSL_DIR/setup-letsencrypt.sh"
        
        log "✅ Temporary certificate created for initial setup"
        info "Run nginx/ssl/setup-letsencrypt.sh on your production server to get real certificates"
        ;;
        
    3)
        info "Place your certificate files in nginx/ssl/ directory:"
        info "  - cert.pem (certificate + intermediate chain)"
        info "  - key.pem (private key)"
        
        if [[ -f "$SSL_DIR/cert.pem" && -f "$SSL_DIR/key.pem" ]]; then
            # Set proper permissions
            chmod 600 "$SSL_DIR/key.pem"
            chmod 644 "$SSL_DIR/cert.pem"
            log "✅ Existing certificate files found and permissions set"
        else
            warning "Certificate files not found. Please add them manually."
        fi
        ;;
        
    4)
        log "Generating Certificate Signing Request (CSR)..."
        
        # Generate private key
        openssl genrsa -out "$SSL_DIR/key.pem" 2048
        
        # Generate CSR
        openssl req -new -key "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.csr" \
            -subj "/C=US/ST=State/L=City/O=JamaaMarket/OU=IT/CN=$DOMAIN/emailAddress=admin@$DOMAIN" \
            -config <(
                echo '[req]'
                echo 'distinguished_name = req_distinguished_name'
                echo 'req_extensions = v3_req'
                echo 'prompt = no'
                echo '[req_distinguished_name]'
                echo "C = US"
                echo "ST = State"
                echo "L = City"
                echo "O = JamaaMarket"
                echo "OU = IT"
                echo "CN = $DOMAIN"
                echo "emailAddress = admin@$DOMAIN"
                echo '[v3_req]'
                echo 'keyUsage = keyEncipherment, dataEncipherment'
                echo 'extendedKeyUsage = serverAuth'
                echo "subjectAltName = DNS:$DOMAIN,DNS:www.$DOMAIN,DNS:api.$DOMAIN"
            )
        
        # Set proper permissions
        chmod 600 "$SSL_DIR/key.pem"
        chmod 644 "$SSL_DIR/cert.csr"
        
        log "✅ CSR generated successfully!"
        info "Submit nginx/ssl/cert.csr to your Certificate Authority"
        info "Save the issued certificate as nginx/ssl/cert.pem"
        ;;
        
    *)
        error "Invalid choice. Please run the script again."
        ;;
esac

echo
log "SSL setup completed!"
info "Certificate files location: nginx/ssl/"
info "Next steps:"
info "  1. Update nginx configuration to enable HTTPS"
info "  2. Update environment variables with HTTPS URLs"
info "  3. Test the SSL configuration"

# Display certificate info if cert.pem exists
if [[ -f "$SSL_DIR/cert.pem" ]]; then
    echo
    info "Certificate Information:"
    openssl x509 -in "$SSL_DIR/cert.pem" -text -noout | grep -E "(Subject:|Issuer:|Not Before:|Not After:|DNS:)"
fi