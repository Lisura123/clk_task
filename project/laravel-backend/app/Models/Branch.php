<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Branch extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'branch_type',
        'address',
        'city',
        'district',
        'province',
        'latitude',
        'longitude',
        'allowed_radius_meters',
        'contact_number',
        'operating_hours_start',
        'operating_hours_end',
        'late_grace_minutes',
        'time_zone',
        'is_active',
        'branch_manager_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'allowed_radius_meters' => 'integer',
        'late_grace_minutes' => 'integer',
        'operating_hours_start' => 'datetime:H:i',
        'operating_hours_end' => 'datetime:H:i',
        'is_active' => 'boolean',
    ];

    /**
     * Branch type constants
     */
    const TYPE_HEADQUARTERS = 'headquarters';
    const TYPE_REGIONAL = 'regional';
    const TYPE_OUTLET = 'outlet';

    /**
     * Get the branch manager
     */
    public function branchManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'branch_manager_id');
    }

    /**
     * Get the user who created this branch
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated this branch
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get user branch assignments
     */
    public function userAssignments(): HasMany
    {
        return $this->hasMany(UserBranchAssignment::class);
    }

    /**
     * Get users assigned to this branch
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_branch_assignments')
            ->withPivot(['is_primary_branch', 'assigned_by', 'assigned_at', 'effective_from', 'effective_to', 'status', 'notes'])
            ->withTimestamps();
    }

    /**
     * Get active users assigned to this branch
     */
    public function activeUsers(): BelongsToMany
    {
        return $this->users()->wherePivot('status', 'active');
    }

    /**
     * Get attendance records for this branch
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * Get time settings for this branch
     */
    public function timeSettings(): HasMany
    {
        return $this->hasMany(AttendanceTimeSetting::class);
    }

    /**
     * Get audit logs for this branch
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AttendanceAuditLog::class);
    }

    /**
     * Get GPS validation failures for this branch
     */
    public function gpsValidationFailures(): HasMany
    {
        return $this->hasMany(GpsValidationFailure::class);
    }

    /**
     * Scope to get active branches only
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by city
     */
    public function scopeInCity($query, string $city)
    {
        return $query->where('city', $city);
    }

    /**
     * Scope to filter by type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('branch_type', $type);
    }

    /**
     * Get employee count attribute
     */
    public function getEmployeeCountAttribute(): int
    {
        return $this->activeUsers()->count();
    }

    /**
     * Check if branch is headquarters
     */
    public function isHeadquarters(): bool
    {
        return $this->branch_type === self::TYPE_HEADQUARTERS;
    }

    /**
     * Get the effective time settings for a given date
     */
    public function getEffectiveTimeSettings($date = null)
    {
        $date = $date ?? now()->toDateString();
        
        // First try branch-specific settings
        $setting = $this->timeSettings()
            ->where('is_active', true)
            ->where('effective_from_date', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->whereNull('effective_to_date')
                      ->orWhere('effective_to_date', '>=', $date);
            })
            ->orderBy('effective_from_date', 'desc')
            ->first();
        
        // If no branch-specific settings, get global default
        if (!$setting) {
            $setting = AttendanceTimeSetting::whereNull('branch_id')
                ->where('is_active', true)
                ->where('effective_from_date', '<=', $date)
                ->where(function ($query) use ($date) {
                    $query->whereNull('effective_to_date')
                          ->orWhere('effective_to_date', '>=', $date);
                })
                ->orderBy('effective_from_date', 'desc')
                ->first();
        }
        
        return $setting;
    }
}
