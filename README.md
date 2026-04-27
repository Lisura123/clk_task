# CLK Task Management System

A full-stack workforce and task management platform built for **Cameralk**. It combines task tracking, attendance, leave management, team scheduling, group chat, and real-time notifications into one system.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [User Roles](#user-roles)
- [Features](#features)
- [Project Structure](#project-structure)
- [Database Models](#database-models)
- [API Reference](#api-reference)
- [Technical Deep Dive](#technical-deep-dive)
  - [Authentication Flow](#authentication-flow)
  - [Request Lifecycle](#request-lifecycle)
  - [Role-Based Access Control](#role-based-access-control)
  - [Real-Time Notifications](#real-time-notifications)
  - [File Upload Pipeline](#file-upload-pipeline)
  - [Attendance Systems](#how-each-attendance-system-works)
  - [Scheduled Plans Visibility](#scheduled-plans-visibility-logic)
  - [Task Scheduler & Alerts](#task-scheduler--automated-alerts)
  - [Frontend State & API Layer](#frontend-state--api-layer)
  - [PWA & Web Push](#pwa--web-push)
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [Scheduler & Automation](#scheduler--automation)
- [Admin Panel (Filament)](#admin-panel-filament)
- [Default Credentials](#default-credentials)

---

## Overview

CLK Task is designed to manage the full workflow of an organization:

- Create and track tasks with subtasks, attachments, comments, and live time tracking
- Three attendance systems: Excel upload, GPS check-in, and out-of-office requests
- Department scheduling with a calendar and per-day to-do/done tracking
- Leave requests with a two-level approval workflow (HOD → Super Admin)
- Group chat and group-based planning
- In-app, email, and Web Push notifications
- Role-based access for admins, HODs, senior employees, and employees

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Laravel 11, PHP 8.4 |
| Database | MySQL |
| Auth | Laravel Sanctum (Bearer tokens) |
| Admin Panel | Filament v3 |
| Email | Gmail SMTP |
| Push Notifications | Web Push API (VAPID) |
| Scheduler | Laravel Task Scheduler via cron |
| State Management | Zustand |
| HTTP Client | Axios |

---

## Architecture

```
project/
├── frontend/                  # React + Vite SPA
│   └── src/
│       ├── pages/             # Full-page route components
│       ├── components/        # Shared/reusable components
│       ├── services/          # Axios API wrappers
│       ├── store/             # Zustand auth store
│       └── layouts/           # App shell wrappers
│
└── laravel-backend/           # Laravel REST API
    ├── app/
    │   ├── Http/Controllers/Api/   # All API controllers
    │   ├── Models/                 # Eloquent models
    │   ├── Notifications/          # Laravel notification classes
    │   ├── Filament/               # Filament admin panel resources
    │   └── Console/               # Artisan commands (scheduler)
    ├── routes/api.php              # All API route definitions
    └── database/migrations/        # DB schema
```

In production the React app is built and served from Laravel's `public/` directory.

---

## User Roles

| Role | Key Permissions |
|---|---|
| `admin` | Full access — all users, tasks, departments, settings, leave, attendance, Filament panel |
| `hod` | Head of Department — manages their department(s), approves leaves, creates plans/schedules |
| `senior_employee` | Can view all employees, create/assign tasks, log time |
| `employee` | Own tasks, leave requests, attendance, group plans |

---

## Features

### 1. Authentication
- Register (requires admin approval before login)
- Login / Logout with Sanctum token
- Forgot password / reset via email link
- Profile update, password change, notification preferences
- Pending registration queue for admins to approve or reject
- Onboarding tour on first login

### 2. Task Management
- Create tasks with title, description, priority (low/medium/high/urgent), status, and due date
- Assign to any employee or department
- **Subtasks** — hierarchical children under a parent task
- **Watchers** — subscribe to updates without being assigned
- **Task Links** — link related tasks together
- **File Attachments** — upload and download files per task
- **Comments** — threaded comments with @mentions
- **Activity Timeline** — full audit trail of all changes
- **Tags** — color-coded labels
- **Templates** — save and reuse task configurations
- Archive / Restore tasks

### 3. Time Tracking
- Start/stop a live timer on any task
- Manual time entries (start time, end time, note)
- Time summary per task and global report for admins

### 4. Daily Work Log
- Employees write what they worked on each day for a task
- Admin sees a consolidated summary across all employees

### 5. Department Scheduled Plans (Calendar)
- HOD creates plans for their department spanning a date range
- Calendar view (monthly) showing plans across each day
- List view of all plans
- **Per-day To-Do / Done tracking**: each day within a plan has todo items and done items
- **Visibility rules:**
  - `admin` → sees all plans
  - `hod` → sees plans for their managed departments
  - `employee` / `senior_employee` → sees plans for their own department OR groups they belong to
- Filter by department and date range
- Recurring plan support (daily / weekly / monthly / yearly)

### 6. Group Plans
- HOD or admin creates shared plans scoped to a group
- All group members can view and interact with group plans

### 7. Group Chat
- Real-time-style messaging within each group
- Edit and delete messages

### 8. Leave Management
- **Leave Types** — Annual, Sick, Casual, etc. (admin configurable)
- **Leave Balances** — tracked per employee per leave type per year
- **Leave Request** — employee applies with date range, reason, optional attachment
- **Two-level approval workflow:**
  1. HOD approves or rejects
  2. Super Admin gives final approval
- **Holiday calendar** — public holidays are excluded from leave day count
- **Leave calendar** — see who is on leave on any day
- **Team on leave** — dashboard widget showing current absences
- Auto notifications sent to approvers on submission and cancellation

### 9. Attendance Management

Three independent systems:

**a) Excel Upload Attendance**
- Procurement/admin uploads CSV/Excel with attendance records
- Records matched to employees by `emp_code`
- View statistics (present, absent, late, half-day)
- Export to CSV, download blank template

**b) GPS Attendance**
- Branch employees check in/out using device GPS coordinates
- Location validated against configured branch center and radius
- Admin/procurement can assign themselves to branches
- Correction request workflow for missed check-ins

**c) Out-of-Office Attendance Requests**
- Employees submit requests for days worked outside office
- HOD approves or rejects
- Procurement team syncs approved records into the main attendance table

### 10. Branch Management
- Admin creates branches with GPS coordinates and allowed radius
- Employees are assigned to branches
- GPS attendance validates location against branch settings

### 11. Notifications
- **In-app notifications** for task assignments, updates, comments, @mentions, leave events, deadline/overdue alerts, registration decisions
- **Email notifications** — opt-in per user
- **Web Push notifications** — browser push via VAPID keys
- Mark as read/unread, delete one, clear all read

### 12. Admin Panel (Filament)
- Accessible at `/admin` — Super Admins only
- Full CRUD GUI for users, departments, tasks, time entries, notifications

---

## Project Structure

### Frontend Pages (`src/pages/`)

| File | Purpose |
|---|---|
| `Login.jsx` / `Register.jsx` | Auth screens |
| `ForgotPassword.jsx` / `ResetPassword.jsx` | Password reset flow |
| `SuperAdminDashboard.jsx` | Admin overview with stats |
| `DeptAdminDashboard.jsx` | HOD dashboard |
| `EmployeeDashboard.jsx` | Employee home |
| `Tasks.jsx` / `TaskDetails.jsx` | Task list and full detail view |
| `MyTasks.jsx` | Employee's own tasks |
| `Schedule.jsx` | Department calendar scheduler |
| `Groups.jsx` | Group management |
| `Departments.jsx` / `DepartmentDetails.jsx` | Department admin |
| `Users.jsx` / `CreateEmployee.jsx` | User management |
| `DeptEmployees.jsx` / `EmployeeDetails.jsx` | Department staff views |
| `PendingRegistrations.jsx` | Approve/reject new signups |
| `MyLeaves.jsx` | Employee leave history and apply |
| `LeaveApproval.jsx` | HOD/Admin approval interface |
| `LeaveBalances.jsx` / `LeaveSettings.jsx` | Leave configuration |
| `Attendance.jsx` / `AttendanceAdmin.jsx` | Attendance views |
| `AttendanceReports.jsx` | Attendance reporting |
| `AttendanceRequests.jsx` | Out-of-office request management |
| `GpsAttendance.jsx` | GPS check-in/check-out UI |
| `BranchManagement.jsx` | Branch CRUD for admin |
| `Notifications.jsx` | Notification centre |
| `Profile.jsx` / `Settings.jsx` | User profile and preferences |
| `Search.jsx` | Global cross-entity search |

### Reusable Components (`src/components/`)

| File | Purpose |
|---|---|
| `Toast.jsx` | Toast notification system (`useToast` hook) |
| `ConfirmDialog.jsx` | Confirmation modal (`useConfirm` hook) |
| `CommentThread.jsx` | Threaded comment display |
| `CommentInput.jsx` | Comment input with @mention support |
| `ActivityTimeline.jsx` | Task activity history display |
| `TimeTracking.jsx` | Live timer widget |
| `DailyWorkLog.jsx` | Work log entry widget |
| `GroupChat.jsx` | Group messaging UI |
| `FileUpload.jsx` | Drag-and-drop file upload |
| `ProtectedRoute.jsx` | Auth guard for routes |
| `OnboardingTour.jsx` | First-login guided walkthrough |
| `PWAInstallPrompt.tsx` | PWA install banner |
| `NotificationPermission.tsx` | Push notification opt-in prompt |

---

## Database Models

| Model | Table | Description |
|---|---|---|
| `User` | `users` | All system users with role, department, status |
| `Department` | `departments` | Company departments |
| `Task` | `tasks` | Tasks with priority, status, assignee, parent |
| `TaskComment` | `task_comments` | Threaded comments |
| `TaskAttachment` | `task_attachments` | File uploads per task |
| `TaskActivity` | `task_activities` | Audit log of all task changes |
| `TaskTag` + `TaskTagAssignment` | `task_tags` / assignments | Color tag system |
| `TaskWatcher` | `task_watchers` | Notification subscribers |
| `TaskLink` | `task_links` | Links between tasks |
| `TaskTemplate` | `task_templates` | Saved task presets |
| `TimeEntry` | `time_entries` | Manual and timer time logs |
| `DailyWorkLog` | `daily_work_logs` | Per-day work notes on tasks |
| `Group` | `groups` | User groups |
| `GroupMessage` | `group_messages` | Chat messages |
| `GroupPlan` | `group_plans` | Group-scoped plans |
| `ScheduledPlan` | `scheduled_plans` | Department plans with date ranges |
| `PlanDailyEntry` | `plan_daily_entries` | Per-day todo/done for a plan |
| `Notification` | `notifications` | In-app notification records |
| `PushSubscription` | `push_subscriptions` | Web push browser endpoints |
| `LeaveType` | `leave_types` | Leave categories |
| `LeaveBalance` | `leave_balances` | Remaining days per user/type |
| `LeaveRequest` | `leave_requests` | Leave applications |
| `Holiday` | `holidays` | Public holidays |
| `Attendance` | `attendances` | Uploaded attendance records |
| `Branch` | `branches` | Physical office branches with GPS coords |
| `UserBranchAssignment` | `user_branch_assignments` | Employee-branch mapping |
| `AttendanceRequest` | `attendance_requests` | Out-of-office requests |
| `AttendanceCorrection` | `attendance_corrections` | GPS correction requests |

---

## API Reference

**Base URL (production):** `https://cameralkstore.com/api`
All protected routes require: `Authorization: Bearer {token}`

### Auth
```
POST   /register                  Register (awaits admin approval)
POST   /login                     Login, returns token
POST   /logout                    Revoke token
GET    /me                        Current user info
PUT    /profile                   Update profile
PUT    /change-password           Change password
POST   /forgot-password           Send reset link
POST   /reset-password            Reset with token
```

### Tasks
```
GET    /tasks                     List tasks (role-filtered)
POST   /tasks                     Create task
GET    /tasks/{id}                Get task details
PUT    /tasks/{id}                Update task
DELETE /tasks/{id}                Delete task
POST   /tasks/{id}/archive        Archive task
POST   /tasks/{id}/restore        Restore task
GET    /tasks/{id}/subtasks       List subtasks
POST   /tasks/{id}/subtasks       Create subtask
GET    /tasks/{id}/attachments    List attachments
POST   /tasks/{id}/attachments    Upload file
GET    /tasks/{id}/comments       Get comments
POST   /tasks/{id}/comments       Add comment
GET    /tasks/statistics          Task statistics
```

### Time Tracking
```
POST   /timer/start               Start timer
POST   /timer/{id}/stop           Stop timer
GET    /timer/running             Get active timer
POST   /time-entries              Manual entry
PUT    /time-entries/{id}         Update entry
DELETE /time-entries/{id}         Delete entry
GET    /time-entries/summary      Summary report
```

### Scheduled Plans
```
GET    /scheduled-plans                              List plans (role-filtered)
POST   /scheduled-plans                              Create plan (admin/hod only)
GET    /scheduled-plans/calendar                     Calendar view
GET    /scheduled-plans/{id}                         Get plan
PUT    /scheduled-plans/{id}                         Update plan
DELETE /scheduled-plans/{id}                         Delete plan
GET    /scheduled-plans/{id}/daily-entries           All daily entries
GET    /scheduled-plans/{id}/daily-entries/{date}    Entry for a specific date
PUT    /scheduled-plans/{id}/daily-entries/{date}    Set todo/done for a day
```

### Leave
```
GET    /leaves/my                 My leave history
POST   /leaves                    Submit leave request
POST   /leaves/{id}/approve       Approve leave
POST   /leaves/{id}/reject        Reject leave
POST   /leaves/{id}/cancel        Cancel leave
GET    /leave-balances            My balances
GET    /leave-types               List leave types
GET    /holidays                  Public holidays
GET    /leaves/calendar           Leave calendar
GET    /leaves/team-on-leave      Team members currently on leave
GET    /leaves/calculate-days     Calculate working days for a range
```

### Attendance
```
POST   /attendance/upload          Upload Excel/CSV file
GET    /attendance                 View records (with filters)
GET    /attendance/export          Export to CSV
GET    /attendance/statistics      Stats summary
GET    /attendance/template        Download blank template
GET    /users/{userId}/attendance  Specific user attendance history
POST   /gps-attendance/check-in    GPS check-in
POST   /gps-attendance/check-out   GPS check-out
GET    /gps-attendance/today       Today's GPS status
GET    /gps-attendance/my-history  Personal GPS history
```

### Notifications
```
GET    /notifications              List all notifications
GET    /notifications/unread-count Unread count (for badge)
POST   /notifications/{id}/read    Mark one as read
POST   /notifications/{id}/unread  Mark one as unread
POST   /notifications/read-all     Mark all as read
DELETE /notifications/{id}         Delete one
DELETE /notifications/clear-read   Delete all read notifications
```

---

## Local Development Setup

### Prerequisites
- PHP 8.2+ with extensions: `pdo_mysql`, `mbstring`, `openssl`, `xml`, `bcmath`, `gd`
- Composer
- Node.js 18+
- MySQL
- XAMPP or equivalent

### Backend

```bash
cd project/laravel-backend

composer install

cp .env.example .env
# Edit .env: DB_DATABASE, DB_USERNAME, DB_PASSWORD, APP_URL=http://localhost:8001

php artisan key:generate
php artisan migrate --seed

# Start API server
/Applications/XAMPP/xamppfiles/bin/php artisan serve --host=localhost --port=8001
```

### Frontend

```bash
cd project/frontend

npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Production Deployment

### Build and deploy frontend

```bash
cd project/frontend
npm run build
scp -r dist/* root@72.62.72.186:/var/www/clk_task/project/laravel-backend/public/
```

### Deploy backend changes

```bash
# Upload a changed file
scp project/laravel-backend/app/Http/Controllers/Api/SomeController.php \
    root@72.62.72.186:/var/www/clk_task/project/laravel-backend/app/Http/Controllers/Api/

# Run pending migrations
ssh root@72.62.72.186 "cd /var/www/clk_task/project/laravel-backend && php artisan migrate --force"

# Clear config cache after env/config changes
ssh root@72.62.72.186 "cd /var/www/clk_task/project/laravel-backend && php artisan config:clear"
```

### Server details

| Setting | Value |
|---|---|
| Server IP | `72.62.72.186` |
| Domain | `https://cameralkstore.com` |
| App root | `/var/www/clk_task/project/laravel-backend/` |
| Web root | `/var/www/clk_task/project/laravel-backend/public/` |
| DB name | `clk_task` |

---

## Scheduler & Automation

The Laravel scheduler sends task alerts automatically via a cron job.

**What it does:**
- Sends **deadline alert** notifications for tasks due within 24 hours
- Sends **overdue** notifications for tasks past their due date
- Prevents duplicate alerts (tracks last notification time per task)

**Cron entry on the server:**
```
* * * * * cd /var/www/clk_task/project/laravel-backend && php artisan schedule:run >> /dev/null 2>&1
```

**Verify cron is active:**
```bash
ssh root@72.62.72.186 "crontab -l"
```

**Manually trigger:**
```bash
ssh root@72.62.72.186 "cd /var/www/clk_task/project/laravel-backend && php artisan schedule:run"
```

---

## Admin Panel (Filament)

URL: `https://cameralkstore.com/admin`

Only users with `role = admin` can access it. Provides a GUI to manage users, departments, tasks, notifications, and time entries without needing direct database access.

---

## Default Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@clktask.com` | `admin123` |
| Super Admin (seed alt) | `admin@taskmanagement.com` | `admin123` |

> Change these passwords immediately in production.

---

## Email Setup

Configure Gmail SMTP in `.env`:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=cameralktask@gmail.com
MAIL_PASSWORD="your-gmail-app-password"
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=cameralktask@gmail.com
```

Use a **Gmail App Password** (not your regular password).
Generate at: Google Account -> Security -> 2-Step Verification -> App Passwords.

---

## Technical Deep Dive

This section explains the internal mechanics of each major system — how requests flow, how data is structured, and why specific design decisions were made.

---

### Authentication Flow

The system uses **Laravel Sanctum** for stateless API token authentication.

**Registration & Approval**

```
User submits /api/register
  → User record created with status = "pending"
  → Admin sees the user in PendingRegistrations.jsx
  → Admin calls POST /api/users/{id}/approve or /reject
  → On approve: status = "active", welcome email sent
  → On reject: status = "rejected", rejection email sent
```

**Login**

```
POST /api/login  { email, password }
  → Laravel checks credentials against users table (bcrypt hash)
  → If status != "active" → 403 returned (not yet approved)
  → On success: personal access token created in personal_access_tokens table
  → Token string returned to frontend
  → Frontend stores token in Zustand store + localStorage
```

**Subsequent Requests**

```
Every API call from React includes:
  Authorization: Bearer {token}

Laravel Sanctum middleware:
  → Looks up token hash in personal_access_tokens
  → Resolves the User model → Auth::user() available in controller
  → If token missing or invalid → 401 Unauthenticated
```

**Password Reset**

```
POST /api/forgot-password  { email }
  → Generates a signed reset token stored in password_reset_tokens table
  → Emails a link: {APP_URL}/reset-password?token=xxx&email=xxx
  → Frontend ResetPassword.jsx collects new password
  → POST /api/reset-password { token, email, password }
  → Token validated, password updated, token deleted
```

---

### Request Lifecycle

A full round-trip for a typical API call (e.g., "Create Task"):

```
1. React component calls taskService.createTask(data)
   └── services/taskService.js → axios.post('/api/tasks', data)

2. Axios interceptor attaches Authorization header from Zustand store

3. Laravel routes/api.php matches:
   Route::middleware('auth:sanctum')->group(function () {
       Route::post('/tasks', [TaskController::class, 'store']);
   });

4. Sanctum middleware authenticates the token → sets Auth::user()

5. TaskController@store runs:
   a. Validate request fields (title, priority, due_date, etc.)
   b. Apply role checks (e.g., employee cannot assign to other depts)
   c. Create Task record via Eloquent
   d. Fire TaskActivity log entry
   e. Dispatch notifications to assignee/watchers
   f. Return TaskResource JSON (201 Created)

6. React receives response → updates local state / shows toast
```

---

### Role-Based Access Control

Roles are stored as a string column on the `users` table:

| Value | Label |
|---|---|
| `admin` | Super Admin |
| `hod` | Head of Department |
| `senior_employee` | Senior Employee |
| `employee` | Employee |

**How it is enforced — Backend**

Controllers check `Auth::user()->role` directly. No separate policy classes are used. Example pattern:

```php
$user = Auth::user();

if ($user->role === 'employee') {
    // Restrict to own tasks only
    $query->where('assigned_to', $user->id);
} elseif ($user->role === 'hod') {
    // Show department tasks
    $managedDepts = $user->managedDepartments()->pluck('id');
    $query->whereIn('department_id', $managedDepts);
} elseif (in_array($user->role, ['admin', 'senior_employee'])) {
    // Full access
}
```

**How it is enforced — Frontend**

The Zustand auth store exposes the user object. Components read `user.role` to conditionally render buttons, routes, or entire pages. `ProtectedRoute.jsx` wraps routes and redirects if the role is insufficient.

---

### Real-Time Notifications

The system has three notification channels. All three are driven by Laravel's **Notification** system.

**Channel 1 — In-App (Database)**

```
Event occurs (task assigned, comment added, leave approved, etc.)
  → Controller dispatches: $user->notify(new TaskAssignedNotification($task))
  → Notification stored in `notifications` table
  → Frontend polls GET /api/notifications/unread-count every 30 seconds
  → Bell icon badge updates
  → User opens Notifications.jsx → GET /api/notifications → renders list
```

**Channel 2 — Email**

```
Same notification class implements toMail()
  → Returns MailMessage with subject, greeting, action button
  → Sent via Gmail SMTP (configured in .env)
  → Only sent if user has email_notifications = true in preferences
```

**Channel 3 — Web Push**

```
User grants browser push permission in NotificationPermission.tsx
  → Frontend calls POST /api/push-subscriptions with browser endpoint + keys
  → Stored in push_subscriptions table
  → On notification dispatch, server sends push payload via VAPID signing
  → Browser displays native push notification even when app is closed
```

---

### File Upload Pipeline

Task attachments flow through this path:

```
Frontend FileUpload.jsx
  → multipart/form-data POST /api/tasks/{id}/attachments
  → Backend stores file: Storage::disk('public')->put('attachments/', $file)
  → File path saved to task_attachments table with original_name, mime_type, size
  → Storage symlink (public/storage → storage/app/public) serves the file
  → Download: GET /api/tasks/{id}/attachments/{attachmentId}/download
    → Returns streamed file response with Content-Disposition: attachment
```

Attendance Excel uploads follow the same storage pattern but additionally parse the file contents:

```
POST /api/attendance/upload
  → File saved temporarily
  → Spatie/SimpleExcel or PhpSpreadsheet reads each row
  → Each row matched to a User by emp_code
  → Attendance record inserted/updated in attendances table
  → Summary (imported count, errors) returned to frontend
```

---

### How Each Attendance System Works

**a) Excel Upload Attendance**

```
Admin/Procurement uploads XLSX or CSV file
  → File parsed row by row
  → Each row: { emp_code, date, status, check_in, check_out }
  → emp_code looked up in users table
  → Attendance record created or updated for that user + date
  → Statistics computed: present / absent / late / half-day
```

**b) GPS Attendance**

```
Employee opens GpsAttendance.jsx
  → Browser Geolocation API returns { latitude, longitude }
  → POST /api/gps-attendance/check-in { lat, lng }

Server side:
  → Looks up user's assigned branch from user_branch_assignments
  → Loads branch { center_lat, center_lng, radius_meters }
  → Haversine formula calculates distance between employee and branch center
  → If distance <= radius → check-in accepted, record created in gps_attendances
  → If distance > radius → 422 returned: "You are not within branch radius"

Check-out follows the same flow, timestamps the existing record.
```

**c) Out-of-Office Requests**

```
Employee submits AttendanceRequest (date, reason, type)
  → HOD sees request in AttendanceRequests.jsx
  → HOD approves → request status = "approved"
  → Procurement team calls POST /api/attendance-requests/{id}/sync
    → Creates a standard attendance record for that date
    → Employee's attendance sheet now shows the day as present
```

---

### Scheduled Plans Visibility Logic

Plans stored in `scheduled_plans` have both a `department_id` and an optional `group_id`. The query applied in `ScheduledPlanController` varies by role:

```php
if ($user->role === 'admin') {
    // No filter — see everything

} elseif ($user->role === 'hod') {
    $managedDeptIds = $user->managedDepartments()->pluck('id');
    $query->whereIn('department_id', $managedDeptIds);

} else {
    // employee / senior_employee
    $userDepartmentId = $user->department_id;
    $userGroupIds = $user->groups()->pluck('groups.id');

    $query->where(function ($q) use ($userDepartmentId, $userGroupIds) {
        if ($userDepartmentId) {
            $q->where('department_id', $userDepartmentId);
        }
        if ($userGroupIds->isNotEmpty()) {
            $q->orWhereIn('group_id', $userGroupIds);
        }
    });
}
```

This same logic is applied in both the **list** (`index()`) and **calendar** (`calendar()`) methods so both views stay consistent.

---

### Task Scheduler & Automated Alerts

Laravel's task scheduler runs a custom `SendTaskAlerts` command on a defined frequency. The cron triggers `php artisan schedule:run` every minute; the command itself only fires every hour.

**Command logic (`app/Console/Commands/SendTaskAlerts.php`):**

```
For every active (non-archived) task with a due_date:

1. OVERDUE CHECK
   If due_date < today AND last_overdue_notification_sent_at is null
   or was more than 24 hours ago:
     → Notify assigned_to user + all watchers
     → Update last_overdue_notification_sent_at = now()

2. DEADLINE WARNING CHECK
   If due_date is within the next 24 hours AND
   last_deadline_notification_sent_at is null:
     → Notify assigned_to user + all watchers
     → Update last_deadline_notification_sent_at = now()
```

The `last_overdue_notification_sent_at` and `last_deadline_notification_sent_at` columns on the `tasks` table prevent duplicate alerts from firing on every scheduler run.

---

### Frontend State & API Layer

**State Management (Zustand)**

A single store in `src/store/authStore.ts` holds:
```ts
{
  user: User | null,
  token: string | null,
  isAuthenticated: boolean,
  login(token, user): void,
  logout(): void,
}
```
Token is persisted to `localStorage` so the session survives page reloads. On app mount, if a token exists in localStorage, the store re-hydrates and the app calls `GET /api/me` to validate it is still active.

**API Service Layer (`src/services/`)**

All HTTP calls go through service modules (e.g. `taskService.js`, `leaveService.js`). Each module:
1. Imports a shared Axios instance that has a request interceptor attaching the Bearer token
2. Has a response interceptor that catches 401 → auto-logs out and redirects to `/login`
3. Exports named functions (`getTasks`, `createTask`, `deleteTask`, etc.)

This keeps components free of fetch/axios logic — components only call service functions and handle the returned data.

---

### PWA & Web Push

The app is a **Progressive Web App (PWA)**:

- `vite.config.ts` uses `vite-plugin-pwa` to generate a service worker and `manifest.json`
- `PWAInstallPrompt.tsx` intercepts the browser's `beforeinstallprompt` event and shows a custom "Add to Home Screen" banner
- The service worker caches static assets for offline support

**Web Push setup:**

```
1. Admin generates VAPID key pair (one-time, stored in .env as VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)
2. Frontend loads the public key and creates a PushSubscription via the browser Push API
3. POST /api/push-subscriptions sends { endpoint, keys.p256dh, keys.auth } to Laravel
4. Stored in push_subscriptions table linked to the user
5. On notification: server signs the payload with the private VAPID key and sends to the browser push service (Google FCM / Mozilla autopush)
6. Browser push service delivers it to the user's device
```

---

*Last updated: April 2026*
