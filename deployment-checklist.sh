#!/bin/bash

# Quick Deployment Checklist Script

echo "🚀 Hostinger Deployment Checklist for clktask.axgphoto.com"
echo "============================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check item
check_item() {
    echo -e "${YELLOW}☐${NC} $1"
}

check_done() {
    echo -e "${GREEN}✓${NC} $1"
}

echo -e "${BLUE}PRE-DEPLOYMENT (Local)${NC}"
check_item "1. Created subdomain 'clktask.axgphoto.com' in Hostinger control panel"
check_item "2. Created MySQL database in Hostinger"
check_item "3. Noted database credentials (name, user, password)"
check_item "4. Run: ./deploy.sh to build and package application"
check_item "5. Updated .env.production with Hostinger database credentials"

echo ""
echo -e "${BLUE}DATABASE${NC}"
check_item "6. Exported local database (clk_task_export.sql)"
check_item "7. Imported database via phpMyAdmin in Hostinger"
check_item "8. Verified all tables imported successfully"

echo ""
echo -e "${BLUE}FILE UPLOAD${NC}"
check_item "9. Uploaded Laravel files to domain root (via SSH/FTP)"
check_item "10. Uploaded frontend build files to public_html/"
check_item "11. Uploaded .env.production as .env to Laravel root"

echo ""
echo -e "${BLUE}SERVER CONFIGURATION (SSH)${NC}"
check_item "12. Run: cd domains/clktask.axgphoto.com"
check_item "13. Run: composer install --optimize-autoloader --no-dev"
check_item "14. Run: php artisan storage:link"
check_item "15. Run: chmod -R 755 storage bootstrap/cache"
check_item "16. Run: php artisan migrate --force"
check_item "17. Run: php artisan config:cache"
check_item "18. Run: php artisan route:cache"
check_item "19. Run: php artisan view:cache"

echo ""
echo -e "${BLUE}SSL & SECURITY${NC}"
check_item "20. Enabled SSL certificate in Hostinger control panel"
check_item "21. Verified HTTPS is working"
check_item "22. Set APP_DEBUG=false in .env"
check_item "23. Set APP_ENV=production in .env"

echo ""
echo -e "${BLUE}TESTING${NC}"
check_item "24. Visit: https://clktask.axgphoto.com"
check_item "25. Test user login"
check_item "26. Test API endpoints"
check_item "27. Test Filament admin: https://clktask.axgphoto.com/admin"
check_item "28. Test file uploads"
check_item "29. Test email notifications"
check_item "30. Check browser console for errors"

echo ""
echo -e "${BLUE}CRON JOBS (Optional)${NC}"
check_item "31. Setup Laravel scheduler cron job"
check_item "32. Setup queue worker (if needed)"

echo ""
echo -e "${BLUE}POST-DEPLOYMENT${NC}"
check_item "33. Document production credentials securely"
check_item "34. Setup automated backups"
check_item "35. Monitor error logs: storage/logs/laravel.log"

echo ""
echo "============================================================"
echo -e "${GREEN}SSH Connection Command:${NC}"
echo "ssh u123456@your-server.hostinger.com"
echo ""
echo -e "${GREEN}Important URLs:${NC}"
echo "Frontend: https://clktask.axgphoto.com"
echo "Admin Panel: https://clktask.axgphoto.com/admin"
echo "API: https://clktask.axgphoto.com/api"
echo ""
echo -e "${YELLOW}For detailed instructions, see: HOSTINGER_DEPLOYMENT_GUIDE.md${NC}"
