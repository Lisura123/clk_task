# Task Management System - Laravel Backend

## Overview
This is the Laravel backend for the Task Management System with MySQL database.

## Features
- 🔐 Authentication with Laravel Sanctum
- 👥 Role-based access control (Super Admin, Department Admin, Employee)
- 📋 Task management with status tracking
- 💬 Comments and mentions system
- ⏱️ Time tracking with timer functionality
- 🔔 Real-time notifications
- 📊 Activity timeline
- 🏷️ Task tagging system
- 📎 File attachments
- 👀 Task watchers

## Requirements
- PHP >= 8.1
- Composer
- MySQL >= 5.7
- XAMPP (or similar local server)

## Installation

### 1. Install Dependencies
```bash
composer install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` file and configure your database:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=clk_task
DB_USERNAME=root
DB_PASSWORD=
```

### 3. Generate Application Key
```bash
php artisan key:generate
```

### 4. Create Database
Create a MySQL database named `clk_task` in phpMyAdmin or MySQL CLI:
```sql
CREATE DATABASE clk_task CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Run Migrations
```bash
php artisan migrate:fresh
```

### 6. Seed Database
```bash
php artisan db:seed
```

### 7. Start Server
```bash
php artisan serve
```

The API will be available at: `http://localhost:8000/api`

## Quick Setup Script
Alternatively, run the setup script:
```bash
chmod +x setup.sh
./setup.sh
```

## Default Credentials

### Super Admin
- Email: `admin@taskmanagement.com`
- Password: `admin123`

### Department Admin (Sales)
- Email: `sales.admin@company.com`
- Password: `password`

### Employee
- Email: `john.doe@company.com`
- Password: `password`

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/me` - Get current user
- `PUT /api/profile` - Update profile
- `PUT /api/change-password` - Change password

### Tasks
- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `GET /api/tasks/{id}` - Get task details
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `POST /api/tasks/{id}/archive` - Archive task
- `GET /api/tasks/statistics` - Get statistics

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `GET /api/users/pending/registrations` - Pending registrations
- `POST /api/users/{id}/approve` - Approve registration
- `POST /api/users/{id}/reject` - Reject registration

### Departments
- `GET /api/departments` - List departments
- `POST /api/departments` - Create department
- `PUT /api/departments/{id}` - Update department
- `DELETE /api/departments/{id}` - Delete department

### Comments
- `GET /api/tasks/{taskId}/comments` - Get comments
- `POST /api/tasks/{taskId}/comments` - Add comment
- `PUT /api/comments/{id}` - Update comment
- `DELETE /api/comments/{id}` - Delete comment

### Time Tracking
- `POST /api/timer/start` - Start timer
- `POST /api/timer/{id}/stop` - Stop timer
- `GET /api/timer/running` - Get running timer
- `POST /api/time-entries` - Manual time entry
- `GET /api/time-entries/summary` - Time summary

### Notifications
- `GET /api/notifications` - List notifications
- `GET /api/notifications/unread-count` - Unread count
- `POST /api/notifications/{id}/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/{id}` - Delete notification

## Database Schema

### Main Tables
- `departments` - Organization departments
- `users` - System users
- `tasks` - Task management
- `task_comments` - Task comments with threading
- `task_activities` - Activity timeline
- `time_entries` - Time tracking
- `notifications` - User notifications
- `task_tags` - Task categorization
- `task_watchers` - Task observers
- `task_attachments` - File uploads

## Role Permissions

### Super Admin
- Full system access
- Manage all departments
- Manage all users
- Create/update/delete departments

### Department Admin
- Manage users in assigned departments
- Create/assign tasks in managed departments
- View all tasks in managed departments
- Approve user registrations

### Employee
- View assigned tasks
- Update task progress
- Add comments
- Log time entries

## Development

### Clear Cache
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

### Run Migrations
```bash
php artisan migrate
```

### Reset Database
```bash
php artisan migrate:fresh --seed
```

## Security
- Authentication via Laravel Sanctum
- Password hashing with bcrypt
- CSRF protection
- SQL injection prevention via Eloquent ORM
- XSS protection

## CORS Configuration
Configure allowed origins in `config/cors.php` for frontend integration.

## Support
For issues or questions, please contact the development team.

## License
MIT License
