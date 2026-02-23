<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GpsValidationFailure extends Model
{
    use HasFactory;

    public $timestamps = false;
    
    protected $fillable = [
        'user_id',
        'branch_id',
        'attempted_latitude',
        'attempted_longitude',
        'branch_latitude',
        'branch_longitude',
        'calculated_distance_meters',
        'allowed_radius_meters',
        'distance_exceeded_by_meters',
        'failure_type',
        'gps_accuracy_meters',
        'device_info',
        'ip_address',
        'attempt_time',
        'is_flagged_suspicious',
        'admin_reviewed',
        'review_notes',
        'created_at',
    ];

    protected $casts = [
        'attempted_latitude' => 'decimal:8',
        'attempted_longitude' => 'decimal:8',
        'branch_latitude' => 'decimal:8',
        'branch_longitude' => 'decimal:8',
        'gps_accuracy_meters' => 'decimal:2',
        'device_info' => 'array',
        'attempt_time' => 'datetime',
        'is_flagged_suspicious' => 'boolean',
        'admin_reviewed' => 'boolean',
        'created_at' => 'datetime',
    ];

    /**
     * Failure type constants
     */
    const FAILURE_OUTSIDE_RADIUS = 'outside_radius';
    const FAILURE_GPS_UNAVAILABLE = 'gps_unavailable';
    const FAILURE_GPS_ACCURACY_LOW = 'gps_accuracy_low';
    const FAILURE_SUSPICIOUS_LOCATION = 'suspicious_location';
    const FAILURE_WRONG_BRANCH = 'wrong_branch';

    /**
     * Get the user
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the branch
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Scope to filter by failure type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('failure_type', $type);
    }

    /**
     * Scope to get flagged suspicious entries
     */
    public function scopeSuspicious($query)
    {
        return $query->where('is_flagged_suspicious', true);
    }

    /**
     * Scope to get unreviewed entries
     */
    public function scopeUnreviewed($query)
    {
        return $query->where('admin_reviewed', false);
    }

    /**
     * Scope to filter by user
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to filter by branch
     */
    public function scopeByBranch($query, int $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Check if this failure is flagged suspicious
     */
    public function isSuspicious(): bool
    {
        return $this->is_flagged_suspicious;
    }

    /**
     * Check if this failure has been reviewed
     */
    public function isReviewed(): bool
    {
        return $this->admin_reviewed;
    }

    /**
     * Get the excess distance attribute
     */
    public function getExcessDistanceAttribute(): int
    {
        return max(0, $this->calculated_distance_meters - $this->allowed_radius_meters);
    }
}
