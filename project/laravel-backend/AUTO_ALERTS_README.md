# Auto Alert Notifications System

## Overview
The system automatically generates alert notifications for:
- **Deadline Alerts**: Tasks due within 24-48 hours
- **Overdue Alerts**: Tasks past their due date

## How It Works

### 1. Alert Command
The `tasks:send-alerts` command checks all tasks and creates notifications:
```bash
php artisan tasks:send-alerts
```

### 2. Automatic Scheduling
The command is scheduled to run **every hour** via Laravel's task scheduler.

### 3. Background Process
A background process (`run-scheduler.sh`) continuously runs the scheduler to ensure alerts are generated automatically.

## Management Commands

### Start the Auto-Alert System
```bash
cd /Applications/XAMPP/xamppfiles/htdocs/clk_task-main/project/laravel-backend
nohup ./run-scheduler.sh > storage/logs/scheduler.log 2>&1 &
```

### Check if Running
```bash
ps aux | grep "run-scheduler.sh" | grep -v grep
```

### Stop the Auto-Alert System
```bash
pkill -f "run-scheduler.sh"
```

### View Scheduler Logs
```bash
tail -f storage/logs/scheduler.log
```

### Manually Trigger Alerts
```bash
php artisan tasks:send-alerts
```

## Alert Logic

### Deadline Alerts
- Sent for tasks due within 24-48 hours
- Won't send duplicate alerts within 12 hours
- Only sent to assigned employees
- Includes hours remaining until deadline

### Overdue Alerts
- Sent for tasks past their due date
- Won't send duplicate alerts within 24 hours
- Only sent to assigned employees
- Includes number of days overdue

## Current Status
✅ **RUNNING** - The scheduler is currently active and checking for alerts every hour.

## Notification Types
The system creates the following notification types:
- `deadline_alert` - Task deadline approaching
- `task_overdue` - Task is overdue
- `task_assigned` - Task assigned to user
- `registration_approved` - User registration approved
- `comment_added` - New comment on task

## Troubleshooting

### Alerts Not Generating?
1. Check if scheduler is running: `ps aux | grep run-scheduler`
2. Check scheduler logs: `tail storage/logs/scheduler.log`
3. Manually run: `php artisan tasks:send-alerts`

### Too Many Duplicate Alerts?
The system has built-in duplicate prevention:
- Deadline alerts: Max 1 per 12 hours per task
- Overdue alerts: Max 1 per 24 hours per task

### Need Immediate Alerts?
Run the command manually:
```bash
php artisan tasks:send-alerts
```

## Technical Details
- **Schedule**: Every hour (defined in `app/Console/Kernel.php`)
- **Command**: `app/Console/Commands/SendTaskAlerts.php`
- **Process**: Background daemon via `run-scheduler.sh`
- **Logs**: `storage/logs/scheduler.log`
