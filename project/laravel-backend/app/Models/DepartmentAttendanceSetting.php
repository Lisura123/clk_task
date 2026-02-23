<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepartmentAttendanceSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'department_id',
        'location_name',
        'address',
        'city',
        'latitude',
        'longitude',
        'allowed_radius_meters',
        'gps_required',
        'work_start_time',
        'work_end_time',
        'late_grace_minutes',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'work_start_time' => 'datetime:H:i',
        'work_end_time' => 'datetime:H:i',
        'late_grace_minutes' => 'integer',
        'is_active' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'allowed_radius_meters' => 'integer',
        'gps_required' => 'boolean',
    ];

    /**
     * Get the department
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the creator
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Check if GPS location is configured
     */
    public function hasLocationConfigured(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }
}
