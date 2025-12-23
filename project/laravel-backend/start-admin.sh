#!/bin/bash

# Filament Admin Panel - Quick Start Script
# This script helps you quickly start the Filament admin panel

echo "========================================"
echo "  Filament Admin Panel - Quick Start"
echo "========================================"
echo ""

# Navigate to Laravel backend directory
cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy .env.example to .env and configure your database."
    exit 1
fi

# Check if vendor directory exists
if [ ! -d vendor ]; then
    echo "📦 Installing dependencies..."
    if [ -f composer.phar ]; then
        php composer.phar install
    else
        composer install
    fi
fi

# Clear caches
echo "🧹 Clearing caches..."
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Generate application key if needed
echo "🔑 Checking application key..."
php artisan key:generate --show > /dev/null 2>&1

# Run migrations
echo "📊 Checking database migrations..."
php artisan migrate --force

# Publish Filament assets
echo "🎨 Publishing Filament assets..."
php artisan filament:assets

# Optimize
echo "⚡ Optimizing application..."
php artisan optimize

echo ""
echo "========================================"
echo "  ✅ Setup Complete!"
echo "========================================"
echo ""
echo "🌐 Admin Panel URL: http://localhost:8000/admin"
echo "👤 Default Admin User: s_admin"
echo "📧 Email: admin@clktask.com"
echo ""
echo "To start the development server, run:"
echo "  php artisan serve"
echo ""
echo "To create additional admin users:"
echo "  php artisan filament:create-admin"
echo ""
echo "📖 Full documentation: FILAMENT_ADMIN_GUIDE.md"
echo "========================================"
