<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
    ];

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
     * Check if user is super admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    /**
     * Check if user is department admin
     */
    public function isDeptAdmin(): bool
    {
        return $this->role === 'dept_admin';
    }

    /**
     * Check if user is employee
     */
    public function isEmployee(): bool
    {
        return $this->role === 'employee';
    }

    /**
     * Check if user manages a specific department
     * @param string|int $departmentIdentifier - Can be department name or ID
     */
    public function managesDepartment($departmentIdentifier): bool
    {
        if (!$this->isDeptAdmin()) {
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
        // Only allow super_admin users to access the admin panel
        return $this->isSuperAdmin();
    }
}
