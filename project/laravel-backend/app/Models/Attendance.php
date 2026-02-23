<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'branch_id',
        'department_id',
        'date',
        'emp_code',
        'fp_code',
        'dept_name',
        'in_time',
        'out_time',
        'attendance_status',
        'notes',
        'source',
        // GPS fields
        'attendance_method',
        'check_in_latitude',
        'check_in_longitude',
        'check_in_device_info',
        'check_in_distance_meters',
        'check_out_latitude',
        'check_out_longitude',
        'check_out_device_info',
        'check_out_distance_meters',
        'gps_validated',
        'gps_validation_status',
        'working_hours',
        'is_late',
        'late_minutes',
        'late_by_minutes',
        'is_early_leave',
        'early_by_minutes',
        'requires_approval',
        'approved_by',
        'approval_status',
        'approval_notes',
        'approved_at',
        'ip_address',
        'user_agent',
        // Enhanced location tracking fields
        'verified_branch_name',
        'verified_branch_address',
        'verified_branch_city',
        'check_in_address',
        'check_in_timestamp',
        'check_in_gps_accuracy',
        'check_out_address',
        'check_out_timestamp',
        'check_out_gps_accuracy',
        'location_verified',
        'location_verification_notes',
        'at_assigned_location',
        'is_department_based',
    ];

    protected $casts = [
        'date' => 'date',
        // Note: in_time and out_time are 'time' columns, not datetime - don't cast them
        // Note: decimal casts removed - they cause issues with empty string values from legacy data
        'check_in_device_info' => 'array',
        'check_out_device_info' => 'array',
        'gps_validated' => 'boolean',
        'is_late' => 'boolean',
        'is_early_leave' => 'boolean',
        'requires_approval' => 'boolean',
        'approved_at' => 'datetime',
        'check_in_timestamp' => 'datetime',
        'check_out_timestamp' => 'datetime',
        'location_verified' => 'boolean',
        'at_assigned_location' => 'boolean',
        'is_department_based' => 'boolean',
    ];

    /**
     * Attendance status constants
     */
    const STATUS_PRESENT = 'present';
    const STATUS_LATE = 'late';
    const STATUS_ABSENT = 'absent';
    const STATUS_HALF_DAY = 'half_day';
    const STATUS_EARLY_LEAVE = 'early_leave';

    /**
     * Attendance method constants
     */
    const METHOD_UPLOAD = 'upload';
    const METHOD_GPS_APP = 'gps_app';
    const METHOD_MANUAL_ENTRY = 'manual_entry';

    /**
     * Validation status constants
     */
    const VALIDATION_VALID = 'valid';
    const VALIDATION_OUTSIDE_RADIUS = 'outside_radius';
    const VALIDATION_OUTSIDE_TIME = 'outside_time';
    const VALIDATION_DUPLICATE = 'duplicate';
    const VALIDATION_MANUAL = 'manual';

    /**
     * Get the user associated with this attendance record
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the branch for GPS-based attendance
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the department for department-based attendance
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the admin who approved this attendance
     */
    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Get audit logs for this attendance
     */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AttendanceAuditLog::class);
    }

    /**
     * Get correction requests for this attendance
     */
    public function corrections(): HasMany
    {
        return $this->hasMany(AttendanceCorrection::class);
    }

    /**
     * Check if employee has checked in
     */
    public function hasCheckedIn(): bool
    {
        return !is_null($this->in_time);
    }

    /**
     * Check if employee has checked out
     */
    public function hasCheckedOut(): bool
    {
        return !is_null($this->out_time);
    }

    /**
     * Check if attendance is GPS-based
     */
    public function isGpsBased(): bool
    {
        return $this->attendance_method === self::METHOD_GPS_APP;
    }

    /**
     * Get hours worked accessor
     */
    public function getHoursWorkedAttribute(): ?string
    {
        if (!$this->in_time || !$this->out_time) {
            return null;
        }

        try {
            $inTime = Carbon::parse($this->in_time);
            $outTime = Carbon::parse($this->out_time);
            $diff = $outTime->diff($inTime);
            return sprintf('%02d:%02d', $diff->h, $diff->i);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Get working minutes accessor
     */
    public function getWorkingMinutesAttribute(): ?int
    {
        if (!$this->in_time || !$this->out_time) {
            return null;
        }

        try {
            $inTime = Carbon::parse($this->in_time);
            $outTime = Carbon::parse($this->out_time);
            return $outTime->diffInMinutes($inTime);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Scope to filter by date
     */
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('date', $date);
    }

    /**
     * Scope to filter by department
     */
    public function scopeForDepartment($query, $deptName)
    {
        return $query->where('dept_name', $deptName);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeBetweenDates($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Scope for filtering by status
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('attendance_status', $status);
    }

    /**
     * Scope for filtering by branch
     */
    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Scope for GPS-based attendance
     */
    public function scopeGpsAttendance($query)
    {
        return $query->where('attendance_method', self::METHOD_GPS_APP);
    }

    /**
     * Scope for uploaded attendance
     */
    public function scopeUploadedAttendance($query)
    {
        return $query->where('attendance_method', self::METHOD_UPLOAD);
    }

    /**
     * Scope for flagged attendance
     */
    public function scopeFlagged($query)
    {
        return $query->where('requires_approval', true);
    }

    /**
     * Scope for late arrivals
     */
    public function scopeLate($query)
    {
        return $query->where('is_late', true);
    }

    /**
     * Scope for early leaves
     */
    public function scopeEarlyLeave($query)
    {
        return $query->where('is_early_leave', true);
    }
}
