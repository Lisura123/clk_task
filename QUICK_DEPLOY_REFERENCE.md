# Hostinger Deployment - Quick Reference

## 🎯 Domain
**Subdomain:** clktask.axgphoto.com

---

## 📋 Pre-Deployment

### 1. Hostinger Setup
```
✓ Create subdomain: clktask.axgphoto.com
✓ Create MySQL database
✓ Note credentials
```

### 2. Local Build
```bash
cd "/Applications/XAMPP/xamppfiles/htdocs/clk_task-main copy"
chmod +x deploy.sh
./deploy.sh
```

### 3. Update Credentials
Edit: `deployment_package/laravel-backend/.env.production`
```
DB_DATABASE=u123456_clktask
DB_USERNAME=u123456_clktask  
DB_PASSWORD=your_password
```

---

## 📤 Upload Files

### Option 1: SSH (Recommended)
```bash
# Connect
ssh u123456@your-server.hostinger.com

# Upload Laravel
scp -r deployment_package/laravel-backend/* u123456@server:/home/u123456/domains/clktask.axgphoto.com/

# Upload Frontend
scp -r deployment_package/frontend-build/* u123456@server:/home/u123456/domains/clktask.axgphoto.com/public_html/
```

### Option 2: File Manager
```
1. Zip deployment_package
2. Upload via Hostinger File Manager
3. Extract in correct location
```

---

## 💾 Database Import

```bash
# Via phpMyAdmin
1. Select database
2. Import → Choose file: clk_task_export.sql
3. Execute
```

---

## ⚙️ Server Setup (SSH Commands)

```bash
# Navigate to project
cd /home/u123456/domains/clktask.axgphoto.com

# Install dependencies
composer install --optimize-autoloader --no-dev

# Setup Laravel
php artisan storage:link
php artisan migrate --force

# Set permissions
chmod -R 755 storage bootstrap/cache
chmod -R 775 storage
chmod -R 775 bootstrap/cache

# Cache optimization
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 🔒 SSL Certificate

```
Hostinger Panel → SSL → Select subdomain → Install SSL
Wait 5-10 minutes for activation
```

---

## 🧪 Testing URLs

```
Frontend:    https://clktask.axgphoto.com
Admin:       https://clktask.axgphoto.com/admin
API Test:    https://clktask.axgphoto.com/api/user (after login)
```

---

## 🐛 Troubleshooting

### View Logs
```bash
tail -f storage/logs/laravel.log
tail -f ~/logs/error_log
```

### Clear Cache
```bash
php artisan optimize:clear
php artisan optimize
```

### Fix Permissions
```bash
find . -type d -exec chmod 755 {} \;
find . -type f -exec chmod 644 {} \;
chmod -R 775 storage bootstrap/cache
```

### Database Connection Issues
```
1. Verify .env credentials
2. Check DB host (usually 'localhost')
3. Test: php artisan tinker → DB::connection()->getPdo();
```

---

## 📞 Support Contacts

**Hostinger Support:** https://www.hostinger.com/support
**Documentation:** See HOSTINGER_DEPLOYMENT_GUIDE.md

---

## ✅ Go-Live Checklist

- [ ] Database imported successfully
- [ ] All files uploaded
- [ ] .env configured correctly
- [ ] Composer dependencies installed
- [ ] Migrations run
- [ ] Permissions set correctly
- [ ] SSL enabled and working
- [ ] Can access frontend
- [ ] Can login to admin panel
- [ ] API endpoints responding
- [ ] Email notifications working
- [ ] No errors in logs

---

**Deployment Date:** _____________
**Database Name:** _____________
**Database User:** _____________
**Server IP:** _____________
