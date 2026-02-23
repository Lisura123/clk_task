<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;

class User extends Authenticatable implements FilamentUser
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'department',
        'department_id',
        'managed_department_ids',
        'profile_picture',
        'phone',
        'status',
        'email_notifications',
        'task_reminders',
        'comment_notifications',
        'emp_code',
        'onboarding_completed',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'managed_department_ids' => 'array',
        'email_notifications' => 'boolean',
        'task_reminders' => 'boolean',
        'comment_notifications' => 'boolean',
        'onboarding_completed' => 'boolean',
    ];

    /**
     * The accessors to append to the model's array form.
     */
    protected $appends = ['department_name'];

    /**
     * Get the department name attribute
     */
    public function getDepartmentNameAttribute(): ?string
    {
        // First try to get from loaded relationship
        if ($this->relationLoaded('departmentRelation') && $this->departmentRelation) {
            return $this->departmentRelation->name;
        }
        
        // If department_id exists, fetch the department name
        if ($this->department_id) {
            $department = Department::find($this->department_id);
            return $department ? $department->name : null;
        }
        
        // Fallback to legacy department field
        return $this->department;
    }

    /**
     * Get the department that the user belongs to
     */
    public function departmentRelation(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    /**
     * Get tasks assigned to this user
     */
    public function assignedTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'assigned_to_id');
    }

    /**
     * Get tasks created by this user
     */
    public function createdTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'created_by_id');
    }

    /**
     * Get comments made by this user
     */
    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }

    /**
     * Get notifications for this user
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get notifications triggered by this user
     */
    public function triggeredNotifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'triggered_by_id');
    }

    /**
     * Get task activities by this user
     */
    public function taskActivities(): HasMany
    {
        return $this->hasMany(TaskActivity::class);
    }

    /**
     * Get attendance records for this user
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Get the user's attendance role
     */
    public function attendanceRole(): HasOne
    {
        return $this->hasOne(AttendanceRole::class);
    }

    /**
     * Get branch assignments for this user
     */
    public function branchAssignments(): HasMany
    {
        return $this->hasMany(UserBranchAssignment::class);
    }

    /**
     * Get branches assigned to this user
     */
    public function branches(): BelongsToMany
    {
        return $this->belongsToMany(Branch::class, 'user_branch_assignments')
            ->withPivot(['is_primary_branch', 'assigned_by', 'assigned_at', 'effective_from', 'effective_to', 'status', 'notes'])
            ->withTimestamps();
    }

    /**
     * Get active branch assignments
     */
    public function activeBranches(): BelongsToMany
    {
        return $this->branches()->wherePivot('status', 'active');
    }

    /**
     * Get the primary branch for this user
     */
    public function primaryBranch(): ?Branch
    {
        return $this->activeBranches()->wherePivot('is_primary_branch', true)->first();
    }

    /**
     * Check if user has attendance access
     */
    public function hasAttendanceAccess(): bool
    {
        $role = $this->attendanceRole;
        return $role && $role->hasAccess();
    }

    /**
     * Check if user is attendance admin/procurement
     */
    public function isAttendanceAdmin(): bool
    {
        $role = $this->attendanceRole;
        return $role && $role->isAdminProcurement();
    }

    /**
     * Check if user is finance for attendance
     */
    public function isAttendanceFinance(): bool
    {
        $role = $this->attendanceRole;
        return $role && $role->isFinance();
    }

    /**
     * Check if user is branch employee for attendance
     */
    public function isAttendanceBranchEmployee(): bool
    {
        $role = $this->attendanceRole;
        return $role && $role->isBranchEmployee();
    }

    /**
     * Showrooms where GPS attendance is required
     */
    const GPS_REQUIRED_SHOWROOMS = [
        'CameraLK Majestic City',
        'CameraLK Kandy',
        'CameraLK Jaffna',
        'CameraLK Batticaloa',
        'CameraLK Tissamaharama',
    ];

    /**
     * Check if GPS attendance is required for this user
     * Required for:
     * 1. Finance Department staff
     * 2. Staff assigned to specific showrooms (Majestic City, Kandy, Jaffna, Batticaloa, Tissamaharama)
     */
    public function isGpsAttendanceRequired(): bool
    {
        // Check if user is in Finance department
        $departmentName = $this->department_name;
        if ($departmentName && strtolower($departmentName) === 'finance') {
            return true;
        }

        // Check if user is assigned to any of the required showrooms
        $assignedBranches = $this->activeBranches()->pluck('name')->toArray();
        foreach ($assignedBranches as $branchName) {
            if (in_array($branchName, self::GPS_REQUIRED_SHOWROOMS)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the list of required showrooms this user is assigned to
     */
    public function getRequiredShowrooms(): array
    {
        $assignedBranches = $this->activeBranches()->pluck('name')->toArray();
        return array_values(array_intersect($assignedBranches, self::GPS_REQUIRED_SHOWROOMS));
    }

    /**
     * Get time entries by this user
     */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * Get tasks this user is watching
     */
    public function watchingTasks(): HasMany
    {
        return $this->hasMany(TaskWatcher::class);
    }

    /**
     * Get groups this user belongs to
     */
    public function groups()
    {
        return $this->belongsToMany(Group::class, 'group_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Check if user is admin (super admin)
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Alias for isSuperAdmin
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Check if user is HOD (department admin/head of department)
     */
    public function isDeptAdmin(): bool
    {
        return $this->role === 'hod';
    }

    /**
     * Alias for isDeptAdmin
     */
    public function isHod(): bool
    {
        return $this->role === 'hod';
    }

    /**
     * Check if user is senior employee
     */
    public function isSeniorEmployee(): bool
    {
        return $this->role === 'senior_employee';
    }

    /**
     * Check if user belongs to Procurement department
     */
    public function isProcurement(): bool
    {
        // Check by department relationship first
        if ($this->departmentRelation) {
            return strtolower($this->departmentRelation->name) === 'procurement';
        }
        // Fallback to department name field
        return strtolower($this->department ?? '') === 'procurement';
    }

    /**
     * Check if user can view employee details (admin, hod, or procurement)
     */
    public function canViewEmployeeDetails($targetUser = null): bool
    {
        // Admin can view all employees
        if ($this->isAdmin()) {
            return true;
        }
        
        // Procurement department users can view all employees
        if ($this->isProcurement()) {
            return true;
        }
        
        // HOD can view employees in their managed departments
        if ($this->isHod() && $targetUser) {
            $managedDepts = $this->managed_department_ids ?? [];
            if (empty($managedDepts) && $this->department_id) {
                $managedDepts = [$this->department_id];
            }
            
            $targetDeptId = $targetUser->department_id ?? null;
            if ($targetDeptId && in_array((int)$targetDeptId, array_map('intval', $managedDepts))) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if user is employee
     */
    public function isEmployee(): bool
    {
        return $this->role === 'employee';
    }

    /**
     * Check if user has management role (admin or hod)
     */
    public function hasManagementRole(): bool
    {
        return in_array($this->role, ['admin', 'hod']);
    }

    /**
     * Check if user manages a specific department
     * @param string|int $departmentIdentifier - Can be department name or ID
     */
    public function managesDepartment($departmentIdentifier): bool
    {
        if (!$this->isHod()) {
            return false;
        }

        $managedDepts = $this->managed_department_ids ?? [];
        
        // If managed_department_ids is empty, fall back to user's own department_id
        if (empty($managedDepts) && $this->department_id) {
            $managedDepts = [$this->department_id];
        }
        
        if (empty($managedDepts)) {
            return false;
        }
        
        // Convert all managed dept values to integers for comparison
        $managedDeptIds = array_map(function($val) {
            if (is_numeric($val)) {
                return (int)$val;
            }
            // If it's a name, look up the ID
            $dept = Department::where('name', $val)->first();
            return $dept ? $dept->id : null;
        }, $managedDepts);
        $managedDeptIds = array_filter($managedDeptIds);
        
        // If input is numeric, check directly against IDs
        if (is_numeric($departmentIdentifier)) {
            return in_array((int)$departmentIdentifier, $managedDeptIds);
        }
        
        // If input is a name, look up the ID and check
        $department = Department::where('name', $departmentIdentifier)->first();
        if ($department) {
            return in_array($department->id, $managedDeptIds);
        }
        
        return false;
    }

    /**
     * Determine if the user can access the Filament admin panel
     */
    public function canAccessPanel(Panel $panel): bool
    {
        // Only allow admin users to access the admin panel
        return $this->isAdmin();
    }

    // =====================================================
    // GPS ATTENDANCE PERMISSION METHODS
    // =====================================================

    /**
     * Check if user can mark GPS attendance (branch employee only)
     */
    public function canMarkGpsAttendance(): bool
    {
        // Must have branch_employee role AND be assigned to at least one branch
        if (!$this->isAttendanceBranchEmployee()) {
            return false;
        }

        return $this->activeBranches()->count() > 0;
    }

    /**
     * Check if user can view attendance reports (admin or procurement department only)
     */
    public function canViewAttendanceReports(): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        // Allow Procurement department employees to view reports
        if ($this->isProcurement()) {
            return true;
        }

        return false;
    }

    /**
     * Check if user can manage attendance (admin/procurement only)
     */
    public function canManageAttendance(): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        return $this->isAttendanceAdmin();
    }

    /**
     * Get the user's attendance role name (use attendanceRoleName attribute)
     */
    public function getAttendanceRoleNameAttribute(): ?string
    {
        $role = $this->attendanceRole()->first();
        return $role?->role;
    }
}
