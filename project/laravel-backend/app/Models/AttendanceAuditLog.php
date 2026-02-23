<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceAuditLog extends Model
{
    use HasFactory;

    public $timestamps = false;
    
    protected $fillable = [
        'attendance_id',
        'user_id',
        'branch_id',
        'action',
        'latitude',
        'longitude',
        'distance_from_branch_meters',
        'failure_reason',
        'validation_details',
        'device_info',
        'ip_address',
        'user_agent',
        'performed_by',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'validation_details' => 'array',
        'device_info' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Action constants
     */
    const ACTION_CHECK_IN_ATTEMPT = 'check_in_attempt';
    const ACTION_CHECK_IN_SUCCESS = 'check_in_success';
    const ACTION_CHECK_IN_FAILED = 'check_in_failed';
    const ACTION_CHECK_OUT_ATTEMPT = 'check_out_attempt';
    const ACTION_CHECK_OUT_SUCCESS = 'check_out_success';
    const ACTION_CHECK_OUT_FAILED = 'check_out_failed';
    const ACTION_MANUAL_ENTRY = 'manual_entry';
    const ACTION_CORRECTION_REQUESTED = 'correction_requested';
    const ACTION_CORRECTION_APPROVED = 'correction_approved';
    const ACTION_CORRECTION_REJECTED = 'correction_rejected';
    const ACTION_DELETED = 'deleted';
    const ACTION_MODIFIED = 'modified';

    /**
     * Get the attendance record
     */
    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

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
     * Get the admin who performed the action
     */
    public function performedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    /**
     * Scope to filter by action
     */
    public function scopeByAction($query, string $action)
    {
        return $query->where('action', $action);
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
     * Scope to get failed actions
     */
    public function scopeFailed($query)
    {
        return $query->whereIn('action', [
            self::ACTION_CHECK_IN_FAILED,
            self::ACTION_CHECK_OUT_FAILED,
        ]);
    }

    /**
     * Scope to get successful actions
     */
    public function scopeSuccessful($query)
    {
        return $query->whereIn('action', [
            self::ACTION_CHECK_IN_SUCCESS,
            self::ACTION_CHECK_OUT_SUCCESS,
        ]);
    }

    /**
     * Check if this is a failed action
     */
    public function isFailed(): bool
    {
        return in_array($this->action, [
            self::ACTION_CHECK_IN_FAILED,
            self::ACTION_CHECK_OUT_FAILED,
        ]);
    }

    /**
     * Check if this is a successful action
     */
    public function isSuccessful(): bool
    {
        return in_array($this->action, [
            self::ACTION_CHECK_IN_SUCCESS,
            self::ACTION_CHECK_OUT_SUCCESS,
        ]);
    }
}
