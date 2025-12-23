#!/bin/bash

# Laravel Scheduler Runner Script
# This script runs the Laravel scheduler in a loop to auto-generate notifications

echo "Starting Laravel Scheduler..."
echo "Alert notifications will be checked every hour"
echo "Press Ctrl+C to stop"
echo ""

cd "$(dirname "$0")"

while true; do
    # Run the scheduler
    /Applications/XAMPP/xamppfiles/bin/php artisan schedule:run >> /dev/null 2>&1
    
    # Show timestamp
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Scheduler checked"
    
    # Wait 1 minute before next check
    sleep 60
done
