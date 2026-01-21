#!/bin/bash

# Interactive Production Build Test Script
# This helps you test the production build step-by-step

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Afrozy Production Build Test                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if build exists
if [ ! -d "build" ]; then
    echo -e "${RED}❌ Build directory not found!${NC}"
    echo -e "${YELLOW}   Run: npm run build${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build directory found${NC}"
echo ""

# Verify critical files
echo -e "${BLUE}📋 Verifying build files...${NC}"
echo ""

if [ -f "build/index.html" ]; then
    echo -e "${GREEN}✅ index.html exists${NC}"
else
    echo -e "${RED}❌ index.html missing${NC}"
    exit 1
fi

if [ -f "build/manifest.json" ]; then
    echo -e "${GREEN}✅ manifest.json exists${NC}"
    START_URL=$(cat build/manifest.json | grep start_url | grep -o '"./"' || echo "")
    if [ -z "$START_URL" ]; then
        echo -e "${GREEN}   → start_url is correctly set to '/'${NC}"
    else
        echo -e "${RED}   → WARNING: start_url might be wrong${NC}"
    fi
else
    echo -e "${RED}❌ manifest.json missing${NC}"
fi

if [ -f "build/_redirects" ]; then
    echo -e "${GREEN}✅ _redirects exists (for Netlify)${NC}"
else
    echo -e "${YELLOW}⚠️  _redirects missing (needed for Netlify)${NC}"
fi

if [ -d "build/static" ]; then
    JS_COUNT=$(find build/static -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
    CSS_COUNT=$(find build/static -name "*.css" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}✅ Static assets directory exists${NC}"
    echo -e "   → JS files: ${JS_COUNT}"
    echo -e "   → CSS files: ${CSS_COUNT}"
else
    echo -e "${RED}❌ static directory missing${NC}"
fi

echo ""
echo -e "${BLUE}📊 Build Size:${NC} $(du -sh build | cut -f1)"
echo ""

# Ask if user wants to start server
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Ready to start test server?${NC}"
echo ""
echo "  This will start a production server on port 3333"
echo "  You can then test routes in your browser:"
echo ""
echo -e "    ${GREEN}http://localhost:3333/${NC}            (home)"
echo -e "    ${GREEN}http://localhost:3333/stores${NC}      (stores listing)"
echo -e "    ${GREEN}http://localhost:3333/store/1${NC}     (⭐ this was broken)"
echo -e "    ${GREEN}http://localhost:3333/admin${NC}       (admin panel)"
echo ""
read -p "Start server now? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Skipping server start.${NC}"
    echo -e "To start manually, run: ${BLUE}npx serve -s build -p 3333${NC}"
    echo ""
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Starting production server...${NC}"
echo ""

# Check if npx is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js/npm.${NC}"
    exit 1
fi

# Kill any existing serve process on port 3333
lsof -ti:3333 | xargs kill -9 2>/dev/null || true

echo -e "${GREEN}Server starting on http://localhost:3333${NC}"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}🧪 Testing Instructions:${NC}"
echo ""
echo "1. Open your browser to: ${GREEN}http://localhost:3333${NC}"
echo ""
echo "2. Open DevTools (F12 or Cmd+Option+I)"
echo ""
echo "3. Check the Console tab - should see NO errors like:"
echo -e "   ${RED}❌ Uncaught SyntaxError: Unexpected token '<'${NC}"
echo -e "   ${RED}❌ Manifest: Line: 1, column: 1, Syntax error${NC}"
echo ""
echo "4. Test these routes by typing in address bar:"
echo -e "   ${GREEN}✓${NC} http://localhost:3333/store/1"
echo -e "   ${GREEN}✓${NC} http://localhost:3333/stores"
echo -e "   ${GREEN}✓${NC} http://localhost:3333/admin"
echo ""
echo "5. For each route:"
echo "   - Page should load correctly (not blank)"
echo "   - Refresh (F5) should work"
echo "   - Back/forward buttons should work"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${RED}Press Ctrl+C to stop the server${NC}"
echo ""

# Start serve
npx serve -s build -p 3333
