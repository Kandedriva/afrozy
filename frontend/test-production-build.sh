#!/bin/bash

# Production Build Test Script for Afrozy Frontend
# This script builds and tests the production bundle locally

set -e  # Exit on any error

echo "🏗️  Building production bundle..."
npm run build

echo ""
echo "✅ Build completed successfully!"
echo ""

# Check if build directory exists
if [ ! -d "build" ]; then
    echo "❌ Error: build directory not found!"
    exit 1
fi

# Check for index.html
if [ ! -f "build/index.html" ]; then
    echo "❌ Error: build/index.html not found!"
    exit 1
fi

# Check for static assets
if [ ! -d "build/static" ]; then
    echo "❌ Error: build/static directory not found!"
    exit 1
fi

echo "📊 Build Statistics:"
echo "-------------------"
echo "Total size: $(du -sh build | cut -f1)"
echo "HTML files: $(find build -name "*.html" | wc -l | tr -d ' ')"
echo "JS files: $(find build/static -name "*.js" 2>/dev/null | wc -l | tr -d ' ')"
echo "CSS files: $(find build/static -name "*.css" 2>/dev/null | wc -l | tr -d ' ')"
echo ""

# Check if serve is installed
if ! command -v serve &> /dev/null; then
    echo "📦 Installing 'serve' package globally..."
    npm install -g serve
fi

echo "🚀 Starting production server on http://localhost:5000"
echo ""
echo "Test the following routes:"
echo "  - http://localhost:5000/"
echo "  - http://localhost:5000/store/1"
echo "  - http://localhost:5000/stores"
echo "  - http://localhost:5000/admin"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Serve with SPA routing support
serve -s build -l 5000
