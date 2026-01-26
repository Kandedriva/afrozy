#!/bin/bash

# Script to start the Afrozy backend server
# This ensures the server picks up all the latest code changes

echo "🚀 Starting Afrozy Backend Server..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check environment variables
echo "🔧 Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "❌ ERROR: .env file not found!"
    echo "Please create a .env file with your configuration"
    exit 1
fi

# Display R2 configuration status (without exposing secrets)
echo "✓ .env file found"
echo ""

# Display important environment variables
echo "📋 Configuration:"
echo "  R2_PUBLIC_URL: $(grep R2_PUBLIC_URL .env | cut -d '=' -f2)"
echo "  R2_BUCKET_NAME: $(grep R2_BUCKET_NAME .env | cut -d '=' -f2)"
echo ""

# Start the server
echo "🌟 Starting server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Use the system Node.js (works on macOS)
if [ -f "/usr/local/bin/node" ]; then
    /usr/local/bin/node server.js
elif [ -f "/opt/homebrew/bin/node" ]; then
    /opt/homebrew/bin/node server.js
else
    node server.js
fi
