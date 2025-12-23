<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeTrackingSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'department_id',
        'auto_start_timer',
        'reminder_interval_minutes',
        'allow_edit_window_hours',
        'require_description',
        'default_category',
    ];

    protected $casts = [
        'auto_start_timer' => 'boolean',
        'reminder_interval_minutes' => 'integer',
        'allow_edit_window_hours' => 'integer',
        'require_description' => 'boolean',
    ];

    /**
     * Get the user these settings belong to
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the department these settings belong to
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Scope for user-specific settings
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId)->whereNull('department_id');
    }

    /**
     * Scope for department-wide settings
     */
    public function scopeForDepartment($query, int $departmentId)
    {
        return $query->where('department_id', $departmentId)->whereNull('user_id');
    }

    /**
     * Scope for global settings
     */
    public function scopeGlobal($query)
    {
        return $query->whereNull('user_id')->whereNull('department_id');
    }
}
