#!/bin/bash

# Task Management System - Laravel Backend Setup Script
# This script sets up the Laravel backend with migrations and seeders

echo "=========================================="
echo "Task Management System - Backend Setup"
echo "=========================================="
echo ""

# Check if composer is installed
if ! command -v composer &> /dev/null; then
    echo "Error: Composer is not installed. Please install Composer first."
    exit 1
fi

# Check if PHP is installed
if ! command -v php &> /dev/null; then
    echo "Error: PHP is not installed. Please install PHP first."
    exit 1
fi

echo "Step 1: Installing Composer dependencies..."
composer install

if [ $? -ne 0 ]; then
    echo "Error: Failed to install Composer dependencies."
    exit 1
fi

echo ""
echo "Step 2: Setting up environment file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo ".env file created from .env.example"
else
    echo ".env file already exists"
fi

echo ""
echo "Step 3: Generating application key..."
php artisan key:generate

echo ""
echo "Step 4: Please configure your database settings in .env file"
echo "Default settings:"
echo "  DB_CONNECTION=mysql"
echo "  DB_HOST=127.0.0.1"
echo "  DB_PORT=3306"
echo "  DB_DATABASE=clk_task"
echo "  DB_USERNAME=root"
echo "  DB_PASSWORD="
echo ""

read -p "Press enter to continue after configuring .env file..."

echo ""
echo "Step 5: Running database migrations..."
php artisan migrate:fresh

if [ $? -ne 0 ]; then
    echo "Error: Database migration failed. Please check your database configuration."
    exit 1
fi

echo ""
echo "Step 6: Seeding initial data..."
php artisan db:seed

if [ $? -ne 0 ]; then
    echo "Warning: Database seeding encountered issues."
fi

echo ""
echo "Step 7: Clearing cache..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear

echo ""
echo "=========================================="
echo "Setup completed successfully!"
echo "=========================================="
echo ""
echo "Default Super Admin Credentials:"
echo "  Email: admin@taskmanagement.com"
echo "  Password: admin123"
echo ""
echo "Sample Department Admin:"
echo "  Email: sales.admin@company.com"
echo "  Password: password"
echo ""
echo "Sample Employee:"
echo "  Email: john.doe@company.com"
echo "  Password: password"
echo ""
echo "To start the development server, run:"
echo "  php artisan serve"
echo ""
echo "The API will be available at:"
echo "  http://localhost:8000/api"
echo ""
