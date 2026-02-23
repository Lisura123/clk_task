# GPS-Based PWA Attendance System

## Overview

The GPS-Based PWA Attendance System is a comprehensive mobile-first attendance solution for CameraLK branch employees. It uses GPS location validation to ensure employees are physically present at their assigned branch locations when marking attendance.

## Key Features

### 1. Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **Admin/Procurement** | Full system access: manage branches, employees, approve corrections, view all reports |
| **Finance** | Read-only access: view daily/monthly reports, export attendance data |
| **Branch Employee** | Limited access: mark GPS attendance at assigned branch, view personal history |

### 2. GPS Location Validation

- **Haversine Formula**: Accurate distance calculation using Earth's spherical geometry
- **Configurable Radius**: Each branch can have a custom GPS radius (10-500 meters)
- **Real-time Validation**: Instant feedback on location validity before check-in
- **Device Information**: Captures device details for audit purposes

### 3. Branch Management

Five CameraLK branches are pre-configured:
- **CLK-MC**: Majestic City (Colombo) - Headquarters
- **CLK-KY**: Kandy - Regional
- **CLK-JF**: Jaffna - Regional
- **CLK-BC**: Batticaloa - Outlet
- **CLK-TM**: Tissamaharama - Outlet

### 4. Time Windows

Default time settings:
- **Check-in Window**: 8:00 AM - 9:30 AM
- **Check-out Window**: 5:00 PM - 7:00 PM
- **Grace Period**: 15 minutes
- **Late Threshold**: 30 minutes

### 5. Correction Workflow

Employees can request corrections for:
- Check-in time modifications
- Check-out time modifications
- Both times

Admin approval workflow ensures proper verification.

## Database Schema

### New Tables

1. **branches** - Branch locations with GPS coordinates
2. **attendance_roles** - User attendance role assignments
3. **user_branch_assignments** - Many-to-many user-branch relationships
4. **attendance_time_settings** - Configurable time windows per branch
5. **attendance_corrections** - Correction request workflow
6. **attendance_audit_logs** - Complete action audit trail
7. **gps_validation_failures** - Failed GPS attempt tracking

### Modified Tables

- **attendances** - Added GPS fields, branch relationship, validation status
- **users** - Added attendance role relationship and methods

## API Endpoints

### Employee Endpoints (`/api/gps-attendance/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/access` | Check user's attendance access level |
| POST | `/check-in` | Mark GPS check-in |
| POST | `/check-out` | Mark GPS check-out |
| GET | `/today` | Get today's attendance status |
| POST | `/validate-location` | Pre-validate location |
| GET | `/my-history` | Get personal attendance history |
| GET | `/my-statistics` | Get personal monthly statistics |
| POST | `/corrections` | Submit correction request |
| GET | `/my-corrections` | View own correction requests |
| DELETE | `/corrections/{id}` | Withdraw pending correction |

### Admin Endpoints (`/api/branches/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all branches |
| POST | `/` | Create new branch |
| GET | `/{id}` | Get branch details |
| PUT | `/{id}` | Update branch |
| DELETE | `/{id}` | Delete branch |
| POST | `/{id}/activate` | Activate branch |
| POST | `/{id}/deactivate` | Deactivate branch |
| GET | `/{id}/employees` | Get branch employees |
| POST | `/{id}/employees` | Assign employee to branch |
| DELETE | `/{branchId}/employees/{userId}` | Remove employee |
| GET | `/{id}/statistics` | Get branch statistics |

### Report Endpoints (`/api/attendance-reports/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/daily` | Daily attendance report |
| GET | `/monthly` | Monthly attendance report |
| GET | `/employee/{userId}` | Individual employee report |
| GET | `/export` | Export CSV report |
| GET | `/gps-validation-stats` | GPS validation statistics |
| GET | `/audit` | Audit log report |

### Correction Endpoints (`/api/attendance-corrections/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all corrections |
| GET | `/statistics` | Correction statistics |
| GET | `/{id}` | Get correction details |
| POST | `/{id}/approve` | Approve correction |
| POST | `/{id}/reject` | Reject correction |
| POST | `/bulk-action` | Bulk approve/reject |

## Installation

### 1. Run Migrations

```bash
cd project/laravel-backend
php artisan migrate
```

### 2. Seed CameraLK Branches

```bash
php artisan db:seed --class=CameraLKBranchSeeder
```

### 3. Assign Attendance Roles

Use the Filament admin panel or create roles manually:

```php
// Admin/Procurement role
AttendanceRole::create([
    'user_id' => $userId,
    'role' => 'admin_procurement',
    'assigned_by' => $adminId,
    'is_active' => true,
]);

// Finance role
AttendanceRole::create([
    'user_id' => $userId,
    'role' => 'finance',
    'assigned_by' => $adminId,
    'is_active' => true,
]);

// Branch Employee role
AttendanceRole::create([
    'user_id' => $userId,
    'role' => 'branch_employee',
    'assigned_by' => $adminId,
    'is_active' => true,
]);
```

### 4. Assign Employees to Branches

```php
UserBranchAssignment::create([
    'user_id' => $userId,
    'branch_id' => $branchId,
    'is_primary_branch' => true,
    'assigned_by' => $adminId,
    'status' => 'active',
]);
```

## Frontend Pages

### GPS Attendance Page (`/dashboard/gps-attendance`)

Mobile-first PWA interface for employees:
- Real-time GPS location detection
- Check-in/check-out buttons
- Today's status display
- Personal history tab
- Monthly statistics tab
- Correction request form

### Branch Management Page (`/dashboard/branches`)

Admin interface for branch management:
- Branch CRUD operations
- Employee assignment
- Branch statistics
- GPS radius configuration

## PWA Configuration

The GPS Attendance page is optimized for PWA usage:
- Works offline (cached assets)
- Home screen installation
- Native-like experience
- GPS permission handling

### Service Worker

Update `public/sw.js` to cache GPS attendance assets:

```javascript
const CACHE_URLS = [
  '/dashboard/gps-attendance',
  // ... other URLs
];
```

### Manifest

Ensure `public/manifest.json` includes:

```json
{
  "name": "CLK Task - GPS Attendance",
  "short_name": "CLK Attend",
  "start_url": "/dashboard/gps-attendance",
  "display": "standalone",
  "theme_color": "#2563eb"
}
```

## Security Features

1. **GPS Spoofing Detection**: Velocity-based detection for impossible travel
2. **Device Fingerprinting**: Track device information for each check-in
3. **Audit Logging**: Complete trail of all attendance actions
4. **IP Tracking**: Record IP address for security
5. **Duplicate Prevention**: Block multiple check-ins/outs per day

## Haversine Formula

The distance calculation uses the Haversine formula:

```
a = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)
c = 2 · atan2(√a, √(1−a))
d = R · c

Where:
- φ = latitude in radians
- λ = longitude in radians
- R = Earth's radius (6,371 km)
- d = distance in km
```

## Troubleshooting

### GPS Not Working

1. Check browser location permissions
2. Ensure HTTPS is enabled (required for geolocation)
3. Try high accuracy mode
4. Check device GPS settings

### Check-in Failing

1. Verify employee is assigned to a branch
2. Check if within GPS radius
3. Verify check-in time window
4. Check for duplicate entries

### Reports Not Loading

1. Verify user has Finance or Admin role
2. Check API authentication
3. Clear browser cache

## Support

For issues or questions:
1. Check the audit logs for error details
2. Review GPS validation failure logs
3. Contact system administrator

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Compatible with**: Laravel 10.x, React 18.x
