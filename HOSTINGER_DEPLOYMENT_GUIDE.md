# Hostinger Deployment Guide for CLK Task Management System

## Subdomain: clktask.axgphoto.com

This guide will walk you through deploying your Laravel + React application to Hostinger.

---

## Prerequisites

1. **Hostinger Account** with:
   - PHP 8.1+ support
   - MySQL database
   - SSH access (recommended)
   - Composer installed
   - Node.js installed (for building frontend)

2. **Subdomain Setup**:
   - Create subdomain `clktask.axgphoto.com` in Hostinger control panel
   - Note the document root path (usually: `public_html/clktask`)

---

## Part 1: Database Setup

### 1.1 Create MySQL Database in Hostinger
1. Go to Hostinger control panel → **Databases** → **MySQL Databases**
2. Create a new database:
   - **Database Name**: `u123456_clktask` (Hostinger adds prefix)
   - **Username**: Create new user
   - **Password**: Generate strong password
   - Save these credentials!

### 1.2 Export Local Database
```bash
# From your local machine
cd "/Applications/XAMPP/xamppfiles/htdocs/clk_task-main copy/project/laravel-backend"

# Export database
/Applications/XAMPP/xamppfiles/bin/mysqldump -u root -p clk_task > clk_task_export.sql
```

### 1.3 Import to Hostinger
1. Go to **phpMyAdmin** in Hostinger panel
2. Select your new database
3. Click **Import**
4. Upload `clk_task_export.sql`
5. Click **Go**

---

## Part 2: Frontend Build

### 2.1 Build React Application
```bash
# Navigate to frontend directory
cd "/Applications/XAMPP/xamppfiles/htdocs/clk_task-main copy/project/frontend"

# Install dependencies (if not already done)
npm install

# Build for production
npm run build
```

This creates a `dist` folder with optimized production files.

---

## Part 3: File Upload to Hostinger

### Option A: Using SSH/SFTP (Recommended)

#### 3.1 Connect via SSH
```bash
ssh u123456@your-server.hostinger.com
```

#### 3.2 Upload Files
```bash
# Upload Laravel backend (exclude node_modules, vendor)
# From your local machine
scp -r "/Applications/XAMPP/xamppfiles/htdocs/clk_task-main copy/project/laravel-backend" u123456@your-server:/home/u123456/domains/clktask.axgphoto.com/
```

### Option B: Using Hostinger File Manager
1. Compress Laravel backend folder (exclude: `node_modules`, `vendor`, `storage/logs/*`)
2. Upload via Hostinger File Manager
3. Extract in subdomain directory

### 3.3 Directory Structure on Server
```
/home/u123456/domains/clktask.axgphoto.com/
├── public_html/              ← Document root (points here)
│   ├── index.php            ← Laravel entry point
│   ├── .htaccess
│   ├── css/
│   ├── js/
│   └── storage -> ../storage/app/public
├── app/
├── bootstrap/
├── config/
├── database/
├── routes/
├── storage/
├── vendor/
└── .env
```

---

## Part 4: Laravel Backend Configuration

### 4.1 Create Production .env File
Create `.env` in Laravel root with production settings:

```env
APP_NAME="Task Management System"
APP_ENV=production
APP_KEY=base64:AUlLymyKlS+oReoq7nLtjKkvR7HntIvxz6+u9dSL1rY=
APP_DEBUG=false
APP_URL=https://clktask.axgphoto.com

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u123456_clktask
DB_USERNAME=u123456_clktask
DB_PASSWORD=your_database_password

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database
SESSION_DRIVER=file
SESSION_LIFETIME=120

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=cameralktask@gmail.com
MAIL_PASSWORD="yisk utkn xifx mcxk"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="cameralktask@gmail.com"
MAIL_FROM_NAME="${APP_NAME}"

SESSION_DOMAIN=.axgphoto.com
SANCTUM_STATEFUL_DOMAINS=clktask.axgphoto.com
```

### 4.2 Update .htaccess Files

**Create `/public_html/.htaccess`:**
```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

**Create root `.htaccess` (outside public_html):**
```apache
RewriteEngine On
RewriteRule ^(.*)$ public_html/$1 [L]
```

### 4.3 SSH Commands for Setup
```bash
# Connect to server
ssh u123456@your-server.hostinger.com

# Navigate to project
cd domains/clktask.axgphoto.com

# Install Composer dependencies
composer install --optimize-autoloader --no-dev

# Set permissions
chmod -R 755 storage bootstrap/cache
chmod -R 775 storage
chmod -R 775 bootstrap/cache

# Create storage link
php artisan storage:link

# Clear and cache config
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations (if needed)
php artisan migrate --force
```

---

## Part 5: Frontend Integration

### 5.1 Copy Built Files to Laravel Public
```bash
# Option 1: Copy frontend build to Laravel public directory
# The frontend dist folder should be copied to public_html/

# Frontend files structure in public_html:
# index.html (rename to index_react.html to avoid conflict)
# assets/
#   ├── css/
#   └── js/

# Option 2: Serve as SPA with Laravel
# Copy all files from frontend/dist/* to public_html/
```

### 5.2 Update Frontend API URL

**Create `frontend/.env.production`:**
```env
VITE_API_URL=https://clktask.axgphoto.com/api
```

**Update `vite.config.ts`:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
```

### 5.3 Rebuild Frontend with Production URL
```bash
cd "/Applications/XAMPP/xamppfiles/htdocs/clk_task-main copy/project/frontend"

# Create production env file
echo 'VITE_API_URL=https://clktask.axgphoto.com/api' > .env.production

# Rebuild
npm run build

# Upload dist/* to public_html/
```

---

## Part 6: SSL Certificate

### 6.1 Enable SSL in Hostinger
1. Go to Hostinger control panel
2. Navigate to **SSL**
3. Select `clktask.axgphoto.com`
4. Click **Install SSL** (Hostinger provides free SSL)
5. Wait 5-10 minutes for activation

### 6.2 Force HTTPS
Add to `public_html/.htaccess` (at the top):
```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## Part 7: Configure CORS

### 7.1 Update Laravel CORS Config
Edit `config/cors.php`:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['https://clktask.axgphoto.com'],
'allowed_origins_patterns' => [],
'supports_credentials' => true,
```

---

## Part 8: Queue and Scheduler Setup (Optional)

### 8.1 Setup Cron Jobs
In Hostinger cPanel → **Cron Jobs**, add:

```bash
* * * * * cd /home/u123456/domains/clktask.axgphoto.com && php artisan schedule:run >> /dev/null 2>&1
```

### 8.2 Queue Worker
For background jobs:
```bash
# Option 1: Supervisor (if available)
# Create supervisor config

# Option 2: Use cron for queue:work
*/5 * * * * cd /home/u123456/domains/clktask.axgphoto.com && php artisan queue:work --stop-when-empty
```

---

## Part 9: Testing

### 9.1 Test Checklist
- [ ] Visit `https://clktask.axgphoto.com`
- [ ] Check Laravel API: `https://clktask.axgphoto.com/api/test`
- [ ] Test login functionality
- [ ] Test database connection
- [ ] Verify email sending
- [ ] Check Filament admin: `https://clktask.axgphoto.com/admin`
- [ ] Test file uploads
- [ ] Check all API endpoints

### 9.2 Debugging
```bash
# View Laravel logs
tail -f storage/logs/laravel.log

# Check PHP errors
tail -f /home/u123456/logs/error_log
```

---

## Part 10: Post-Deployment

### 10.1 Security
- [ ] Set `APP_DEBUG=false`
- [ ] Use strong `APP_KEY`
- [ ] Secure database credentials
- [ ] Regular backups
- [ ] Keep dependencies updated

### 10.2 Performance
- [ ] Enable OPcache
- [ ] Use `composer install --optimize-autoloader --no-dev`
- [ ] Cache config, routes, views
- [ ] Optimize frontend bundle size

---

## Troubleshooting

### Issue: 500 Internal Server Error
- Check file permissions (755 for directories, 644 for files)
- Check `.env` file exists and has correct values
- Check `storage` and `bootstrap/cache` are writable
- View error logs

### Issue: Database Connection Failed
- Verify database credentials in `.env`
- Check database host (usually `localhost`)
- Ensure database user has privileges

### Issue: CORS Errors
- Update `config/cors.php`
- Clear config cache: `php artisan config:clear`
- Check `SANCTUM_STATEFUL_DOMAINS` in `.env`

### Issue: Assets Not Loading
- Check `.htaccess` files
- Verify `APP_URL` in `.env`
- Run `php artisan storage:link`

---

## Quick Command Reference

```bash
# SSH Connection
ssh u123456@your-server.hostinger.com

# Navigate to project
cd domains/clktask.axgphoto.com

# Update code
git pull origin main  # If using git

# Update dependencies
composer install --no-dev

# Clear caches
php artisan optimize:clear

# Re-cache
php artisan optimize

# View logs
tail -f storage/logs/laravel.log

# File permissions
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;
chmod -R 775 storage bootstrap/cache
```

---

## Support

If you encounter issues:
1. Check Hostinger documentation
2. Review Laravel logs
3. Check PHP error logs
4. Test API endpoints individually
5. Verify database connection

---

**Deployment Date**: December 23, 2025
**Domain**: clktask.axgphoto.com
**Server**: Hostinger
