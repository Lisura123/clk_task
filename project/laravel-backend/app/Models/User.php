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
     */
    public function managesDepartment(string $departmentName): bool
    {
        if (!$this->isDeptAdmin()) {
            return false;
        }

        $managedDepts = $this->managed_department_ids ?? [];
        
        // Check if the department name is directly in the array
        if (in_array($departmentName, $managedDepts)) {
            return true;
        }
        
        // If the input is numeric (department ID), find its name and check
        if (is_numeric($departmentName)) {
            $department = Department::find((int)$departmentName);
            if ($department) {
                return in_array($department->name, $managedDepts);
            }
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
