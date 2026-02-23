# CLK Task Management System

A comprehensive enterprise task management and HR system built with **React** (Frontend) and **Laravel** (Backend). The system provides complete task lifecycle management, attendance tracking, leave management, team collaboration, and administrative tools.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Features](#features)
- [User Roles & Permissions](#user-roles--permissions)
- [Installation](#installation)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Default Credentials](#default-credentials)

---

## 🎯 Overview

CLK Task Management System is designed for organizations to:
- Manage tasks with complete lifecycle tracking
- Track employee attendance via Excel/PDF uploads
- Handle leave requests and approvals
- Facilitate team collaboration with group chats
- Schedule and plan team activities
- Monitor employee productivity with work logs
- Send real-time notifications (in-app and email)

---

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Zustand** - State management
- **Lucide React** - Icons
- **Axios** - HTTP client

### Backend
- **Laravel 10** (PHP 8.1+)
- **MySQL** - Database
- **Laravel Sanctum** - API Authentication
- **Filament** - Admin Panel
- **Laravel Notifications** - Email/Database notifications

### Admin Panel
- **Filament v3** - Full-featured admin dashboard
- Accessible at `/admin`

---

## ✨ Features

### 1. Authentication & Authorization
- **User Registration** with admin approval workflow
- **Secure Login** with Laravel Sanctum tokens
- **Password Reset** via email
- **Role-Based Access Control (RBAC)** - 4 user roles
- **Profile Management** with photo upload
- **Notification Preferences** (email, task reminders, comments)

### 2. Task Management
- **Create, Edit, Delete Tasks**
- **Task Assignment** to employees
- **Priority Levels**: Low, Medium, High, Urgent
- **Status Tracking**: To Do, In Progress, Completed, On Hold
- **Progress Percentage** (0-100%)
- **Due Date Management** with overdue alerts
- **Task Archiving** and restoration
- **Subtasks** for breaking down complex tasks
- **File Attachments** with download support
- **Task Links** (URLs, references)
- **Task Watchers** - Get notified of changes
- **Task Participants** - Team collaboration
- **Activity Timeline** - Complete audit trail

### 3. Comments & Collaboration
- **Threaded Comments** on tasks
- **@Mentions** to notify team members
- **Comment Editing** and deletion
- **Real-time Updates**

### 4. Time Tracking
- **Manual Time Entry** logging
- **Timer Functionality** - Start/Stop timer
- **Daily Work Logs** with descriptions
- **Time Summary Reports**
- **Hours per Task** tracking

### 5. Department Management
- **Create/Edit/Delete Departments**
- **Department Statistics** (tasks, employees)
- **Employee Assignment** to departments
- **Cross-Department Task Assignment** (for admins)

### 6. User Management
- **Create Employees** manually
- **Pending Registration Approval**
- **User Activation/Deactivation**
- **Profile Picture Upload**
- **Employee Statistics** (tasks completed, hours logged)
- **Search & Filter Users**

### 7. Leave Management
- **Leave Types**: Annual, Sick, Casual, Maternity, etc.
- **Leave Balances** per employee
- **Leave Request Submission**
- **Approval Workflow** (Admin/HOD approval)
- **Leave Calendar View**
- **Team on Leave** visibility
- **Holiday Management**
- **Automatic Day Calculation** (excludes weekends/holidays)
- **Days Note** for partial days

### 8. Attendance Management
- **Excel/PDF/CSV Upload** for bulk attendance
- **Attendance Statistics** (Present, Absent, Late, Half Day)
- **Employee Attendance History**
- **Template Download** for data format
- **Multi-format Support**: XLSX, XLS, CSV, PDF

### 9. Group Collaboration
- **Create Groups** with members and leaders
- **Group Chat** with real-time messaging
- **Message Editing/Deletion**
- **Group Plans** for team scheduling
- **Member Management**

### 10. Scheduled Plans
- **Weekly/Monthly Planning**
- **Calendar View** of plans
- **Daily To-Do Tracking**
- **Done/Pending Status** per day
- **Plan Assignment** to teams

### 11. Notifications
- **In-App Notifications** bell icon
- **Email Notifications** (optional)
- **Web Push Notifications** (PWA support)
- **Notification Types**:
  - Task assigned
  - Task status changed
  - Comment added
  - @Mentioned
  - Leave approved/rejected
  - Registration approved/rejected
- **Mark as Read/Unread**
- **Clear All Read**

### 12. Dashboard & Analytics
- **Role-Based Dashboards**:
  - Super Admin Dashboard
  - Department Admin Dashboard
  - Employee Dashboard
- **Task Statistics** (total, completed, in progress, overdue)
- **Recent Activity Feed**
- **Quick Actions**

### 13. Search & Filters
- **Global Search** across tasks and users
- **Advanced Filters**:
  - By status
  - By priority
  - By department
  - By date range
  - By assigned user

### 14. Filament Admin Panel
- **Complete CRUD** for all entities
- **User Management** with bulk actions
- **Task Management** with filters
- **Time Entry Viewing**
- **Notification Management**
- **Dashboard Widgets** with statistics

---

## 👥 User Roles & Permissions

### Super Admin (Admin)
| Feature | Access |
|---------|--------|
| View all tasks | ✅ |
| Create/Edit/Delete any task | ✅ |
| Manage all users | ✅ |
| Create/Edit/Delete departments | ✅ |
| Approve/Reject registrations | ✅ |
| Manage leave types & holidays | ✅ |
| Approve/Reject leaves | ✅ |
| Upload attendance | ✅ |
| Access Filament Admin Panel | ✅ |
| View all reports | ✅ |

### Head of Department (HOD)
| Feature | Access |
|---------|--------|
| View department tasks | ✅ |
| Create/Assign tasks in department | ✅ |
| Manage department users | ✅ |
| Approve registrations (department) | ✅ |
| View team leaves | ✅ |
| Create groups | ✅ |
| View employee attendance | ✅ |

### Senior Employee
| Feature | Access |
|---------|--------|
| View all tasks (read-only cross-dept) | ✅ |
| Create/Assign tasks | ✅ |
| Manage own tasks | ✅ |
| View all employees | ✅ |
| Log time entries | ✅ |
| Submit leave requests | ✅ |

### Employee
| Feature | Access |
|---------|--------|
| View assigned tasks | ✅ |
| Update own task status/progress | ✅ |
| Add comments | ✅ |
| Log time entries | ✅ |
| Submit leave requests | ✅ |
| View own attendance | ✅ |

---

## 🚀 Installation

### Prerequisites
- PHP >= 8.1
- Composer
- Node.js >= 18
- MySQL >= 5.7
- XAMPP/MAMP (or similar)

### Backend Setup

```bash
# Navigate to backend
cd project/laravel-backend

# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure database in .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=clk_task
DB_USERNAME=root
DB_PASSWORD=

# Run migrations
php artisan migrate

# Seed database (optional)
php artisan db:seed

# Start server
php artisan serve --host=localhost --port=8001
```

### Frontend Setup

```bash
# Navigate to frontend
cd project/frontend

# Install dependencies
npm install

# Configure API URL in .env
VITE_API_URL=http://localhost:8001/api

# Start development server
npm run dev

# Build for production
npm run build
```

### Filament Admin Panel

```bash
# Create admin user
php artisan make:filament-user

# Access at: http://localhost:8001/admin
```

---

## 📡 API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | User registration |
| POST | `/api/login` | User login |
| POST | `/api/logout` | User logout |
| GET | `/api/me` | Get current user |
| PUT | `/api/profile` | Update profile |
| PUT | `/api/change-password` | Change password |
| POST | `/api/forgot-password` | Request password reset |
| POST | `/api/reset-password` | Reset password |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks (with filters) |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/{id}` | Get task details |
| PUT | `/api/tasks/{id}` | Update task |
| DELETE | `/api/tasks/{id}` | Delete task |
| POST | `/api/tasks/{id}/archive` | Archive task |
| POST | `/api/tasks/{id}/restore` | Restore task |
| GET | `/api/tasks/{id}/attachments` | Get attachments |
| POST | `/api/tasks/{id}/attachments` | Upload attachment |
| GET | `/api/tasks/{id}/participants` | Get participants |
| GET | `/api/tasks/{id}/subtasks` | Get subtasks |
| POST | `/api/tasks/{id}/subtasks` | Create subtask |
| GET | `/api/tasks/statistics` | Get task statistics |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/{taskId}/comments` | Get comments |
| POST | `/api/tasks/{taskId}/comments` | Add comment |
| PUT | `/api/comments/{id}` | Edit comment |
| DELETE | `/api/comments/{id}` | Delete comment |

### Time Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/{taskId}/time-entries` | Get time entries |
| POST | `/api/time-entries` | Create time entry |
| PUT | `/api/time-entries/{id}` | Update time entry |
| DELETE | `/api/time-entries/{id}` | Delete time entry |
| POST | `/api/timer/start` | Start timer |
| POST | `/api/timer/{id}/stop` | Stop timer |
| GET | `/api/timer/running` | Get running timer |
| GET | `/api/time-entries/summary` | Get summary |

### Daily Work Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/my-work-logs` | Get my work logs |
| GET | `/api/work-logs/summary` | Admin summary |
| GET | `/api/tasks/{task}/work-logs` | Get task work logs |
| POST | `/api/tasks/{task}/work-logs` | Create work log |
| PUT | `/api/tasks/{task}/work-logs/{log}` | Update work log |
| DELETE | `/api/tasks/{task}/work-logs/{log}` | Delete work log |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user (admin) |
| GET | `/api/users/{id}` | Get user details |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Delete user |
| GET | `/api/users/{id}/statistics` | User statistics |
| GET | `/api/users/pending/registrations` | Pending registrations |
| POST | `/api/users/{id}/approve` | Approve registration |
| POST | `/api/users/{id}/reject` | Reject registration |

### Departments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/departments` | List departments |
| POST | `/api/departments` | Create department |
| GET | `/api/departments/{id}` | Get department |
| PUT | `/api/departments/{id}` | Update department |
| DELETE | `/api/departments/{id}` | Delete department |
| GET | `/api/departments/{id}/statistics` | Department stats |
| GET | `/api/departments/{id}/employees` | Department employees |

### Leave Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leave-types` | Get leave types |
| POST | `/api/leave-types` | Create leave type |
| PUT | `/api/leave-types/{id}` | Update leave type |
| DELETE | `/api/leave-types/{id}` | Delete leave type |
| GET | `/api/leave-balances` | My leave balances |
| GET | `/api/leaves` | All leaves (admin) |
| GET | `/api/leaves/my` | My leaves |
| GET | `/api/leaves/pending` | Pending leaves |
| GET | `/api/leaves/statistics` | Leave statistics |
| GET | `/api/leaves/calendar` | Leave calendar |
| POST | `/api/leaves` | Submit leave request |
| POST | `/api/leaves/{id}/approve` | Approve leave |
| POST | `/api/leaves/{id}/reject` | Reject leave |
| POST | `/api/leaves/{id}/cancel` | Cancel leave |
| GET | `/api/holidays` | Get holidays |
| POST | `/api/holidays` | Create holiday |

### Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/attendance` | List attendance |
| POST | `/api/attendance/upload` | Upload attendance file |
| GET | `/api/attendance/statistics` | Attendance stats |
| GET | `/api/attendance/template` | Download template |
| GET | `/api/users/{userId}/attendance` | User attendance |
| GET | `/api/attendance/{id}` | Get attendance record |
| DELETE | `/api/attendance/{id}` | Delete attendance |

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | List groups |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/{id}` | Get group |
| PUT | `/api/groups/{id}` | Update group |
| DELETE | `/api/groups/{id}` | Delete group |
| GET | `/api/groups/{group}/messages` | Get messages |
| POST | `/api/groups/{group}/messages` | Send message |
| GET | `/api/groups/{group}/plans` | Get plans |
| POST | `/api/groups/{group}/plans` | Create plan |

### Scheduled Plans

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scheduled-plans` | List plans |
| POST | `/api/scheduled-plans` | Create plan |
| GET | `/api/scheduled-plans/calendar` | Calendar view |
| GET | `/api/scheduled-plans/upcoming` | Upcoming plans |
| GET | `/api/scheduled-plans/{id}` | Get plan |
| PUT | `/api/scheduled-plans/{id}` | Update plan |
| DELETE | `/api/scheduled-plans/{id}` | Delete plan |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get notifications |
| GET | `/api/notifications/unread-count` | Unread count |
| POST | `/api/notifications/{id}/read` | Mark as read |
| POST | `/api/notifications/read-all` | Mark all read |
| DELETE | `/api/notifications/{id}` | Delete notification |
| DELETE | `/api/notifications/clear-read` | Clear read |

---

## 🗄 Database Schema

### Main Tables

| Table | Description |
|-------|-------------|
| `users` | System users with roles |
| `departments` | Organization departments |
| `tasks` | Task management |
| `task_comments` | Task comments with threading |
| `task_attachments` | File uploads |
| `task_activities` | Activity timeline/audit |
| `task_links` | External links on tasks |
| `task_watchers` | Task observers |
| `time_entries` | Time tracking records |
| `daily_work_logs` | Daily work descriptions |
| `groups` | Team groups |
| `group_messages` | Group chat messages |
| `group_plans` | Group planning |
| `scheduled_plans` | Department scheduling |
| `plan_daily_entries` | Daily to-do tracking |
| `notifications` | User notifications |
| `leave_types` | Types of leave |
| `leave_balances` | User leave balances |
| `leaves` | Leave requests |
| `holidays` | Company holidays |
| `attendances` | Attendance records |

---

## 🔐 Default Credentials

### Super Admin
```
Email: admin@clktask.com
Username: s_admin
Password: admin123
```

### Filament Admin Panel
```
URL: http://localhost:8001/admin
Email: admin@clktask.com
Password: admin123
```

---

## 📁 Project Structure

```
clk_task/
├── project/
│   ├── frontend/                 # React Frontend
│   │   ├── src/
│   │   │   ├── components/       # Reusable components
│   │   │   ├── layouts/          # Layout components
│   │   │   ├── pages/            # Page components
│   │   │   ├── services/         # API services
│   │   │   ├── store/            # Zustand store
│   │   │   ├── App.tsx           # Main app
│   │   │   └── main.tsx          # Entry point
│   │   ├── public/               # Static assets
│   │   └── package.json
│   │
│   └── laravel-backend/          # Laravel Backend
│       ├── app/
│       │   ├── Console/          # Commands
│       │   ├── Filament/         # Admin panel resources
│       │   ├── Http/
│       │   │   └── Controllers/  # API Controllers
│       │   ├── Models/           # Eloquent models
│       │   └── Notifications/    # Notification classes
│       ├── config/               # Configuration
│       ├── database/
│       │   ├── migrations/       # Database migrations
│       │   └── seeders/          # Database seeders
│       ├── routes/
│       │   ├── api.php           # API routes
│       │   └── web.php           # Web routes
│       └── storage/              # File storage
│
└── README.md                     # This file
```

---

## 🌐 Deployment

### Production Server
- **Server**: Ubuntu/CentOS with Nginx/Apache
- **PHP**: 8.1+ with required extensions
- **Node.js**: 18+ for frontend build
- **MySQL**: 5.7+ or MariaDB 10.3+

### Environment Variables

Backend (`.env`):
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

DB_CONNECTION=mysql
DB_HOST=localhost
DB_DATABASE=clk_task
DB_USERNAME=your_user
DB_PASSWORD=your_password

MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email
MAIL_PASSWORD=your_app_password
MAIL_ENCRYPTION=tls
```

Frontend (`.env`):
```env
VITE_API_URL=https://yourdomain.com/api
```

---

## 📞 Support

For issues or feature requests, please contact the development team.

---

## 📄 License

This project is proprietary software. All rights reserved.

---

**Version**: 2.0.0  
**Last Updated**: February 2026
