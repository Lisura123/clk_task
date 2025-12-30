#!/bin/bash

# Deployment Script for Hostinger
# This script prepares your application for deployment

echo "🚀 Starting deployment preparation..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Build Frontend
echo -e "${BLUE}📦 Building frontend...${NC}"
cd "project/frontend" || exit

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Build for production
echo "Building for production..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend build successful${NC}"
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi

cd ../..

# Step 2: Prepare Laravel Backend
echo -e "${BLUE}📦 Preparing Laravel backend...${NC}"
cd "project/laravel-backend" || exit

# Copy production env file
if [ -f ".env.production" ]; then
    echo "Creating production .env file template..."
    echo -e "${GREEN}✓ .env.production is ready${NC}"
    echo -e "${RED}⚠ Remember to update database credentials in .env.production before uploading!${NC}"
else
    echo -e "${RED}✗ .env.production not found${NC}"
fi

cd ../..

# Step 3: Create deployment package
echo -e "${BLUE}📦 Creating deployment package...${NC}"

# Create deployment directory
mkdir -p deployment_package

# Copy Laravel files (excluding unnecessary files)
echo "Copying Laravel backend..."
rsync -av --progress project/laravel-backend/ deployment_package/laravel-backend/ \
    --exclude node_modules \
    --exclude vendor \
    --exclude .git \
    --exclude storage/logs/*.log \
    --exclude .env \
    --exclude .env.local

# Copy frontend build
echo "Copying frontend build..."
mkdir -p deployment_package/frontend-build
cp -r project/frontend/dist/* deployment_package/frontend-build/

# Step 4: Create SQL export
echo -e "${BLUE}💾 Exporting database...${NC}"
/Applications/XAMPP/xamppfiles/bin/mysqldump -u root -p clk_task > deployment_package/clk_task_export.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database exported successfully${NC}"
else
    echo -e "${RED}✗ Database export failed${NC}"
fi

# Step 5: Create deployment instructions
cat > deployment_package/DEPLOY_README.txt << 'EOF'
DEPLOYMENT INSTRUCTIONS
=======================

1. DATABASE SETUP:
   - Create MySQL database in Hostinger
   - Import: clk_task_export.sql

2. UPLOAD FILES:
   a. Laravel Backend:
      - Upload contents of 'laravel-backend' folder to your domain root
      - Example: /home/u123456/domains/clktask.axgphoto.com/

   b. Frontend:
      - Upload contents of 'frontend-build' folder to 'public_html' directory

3. CONFIGURE .ENV:
   - Copy .env.production to .env
   - Update database credentials
   - Update APP_URL to: https://clktask.axgphoto.com

4. RUN COMMANDS (via SSH):
   cd /home/u123456/domains/clktask.axgphoto.com
   composer install --optimize-autoloader --no-dev
   php artisan storage:link
   php artisan migrate --force
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   chmod -R 755 storage bootstrap/cache

5. SSL:
   - Enable SSL in Hostinger control panel for clktask.axgphoto.com

6. TEST:
   - Visit: https://clktask.axgphoto.com
   - Test login and API endpoints

For detailed instructions, see: HOSTINGER_DEPLOYMENT_GUIDE.md
EOF

echo -e "${GREEN}✓ Deployment package created in 'deployment_package' folder${NC}"

# Step 6: Create zip archive
echo -e "${BLUE}📦 Creating zip archive...${NC}"
cd deployment_package
zip -r ../clktask-deployment-$(date +%Y%m%d-%H%M%S).zip . -x "*.DS_Store"
cd ..

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment preparation complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Check the 'deployment_package' folder"
echo "2. Upload files to Hostinger via SSH/FTP"
echo "3. Update .env.production with your database credentials"
echo "4. Follow the instructions in DEPLOY_README.txt"
echo "5. See HOSTINGER_DEPLOYMENT_GUIDE.md for detailed guide"
echo ""
echo -e "${RED}⚠ Important:${NC}"
echo "- Update database credentials in .env.production"
echo "- Enable SSL in Hostinger control panel"
echo "- Test all functionality after deployment"
