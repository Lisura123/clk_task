<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceTimeSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'setting_name',
        'check_in_start_time',
        'check_in_end_time',
        'grace_period_minutes',
        'check_out_start_time',
        'check_out_end_time',
        'minimum_working_hours',
        'maximum_working_hours',
        'late_threshold_minutes',
        'half_day_threshold_minutes',
        'is_active',
        'effective_from_date',
        'effective_to_date',
        'applies_to_days',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'check_in_start_time' => 'datetime:H:i',
        'check_in_end_time' => 'datetime:H:i',
        'check_out_start_time' => 'datetime:H:i',
        'check_out_end_time' => 'datetime:H:i',
        'minimum_working_hours' => 'decimal:2',
        'maximum_working_hours' => 'decimal:2',
        'is_active' => 'boolean',
        'effective_from_date' => 'date',
        'effective_to_date' => 'date',
        'applies_to_days' => 'array',
    ];

    /**
     * Get the branch (null for global settings)
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the user who created this setting
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated this setting
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope to get active settings
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get global settings
     */
    public function scopeGlobal($query)
    {
        return $query->whereNull('branch_id');
    }

    /**
     * Scope to get effective settings for a date
     */
    public function scopeEffectiveOn($query, $date = null)
    {
        $date = $date ?? now()->toDateString();
        
        return $query->where('effective_from_date', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to_date')
                  ->orWhere('effective_to_date', '>=', $date);
            });
    }

    /**
     * Check if this setting is global
     */
    public function isGlobal(): bool
    {
        return is_null($this->branch_id);
    }

    /**
     * Check if this setting applies to a specific day
     */
    public function appliesToDay(string $day): bool
    {
        if (empty($this->applies_to_days)) {
            return true; // Applies to all days if not specified
        }
        
        if (in_array('All', $this->applies_to_days)) {
            return true;
        }
        
        return in_array($day, $this->applies_to_days);
    }

    /**
     * Get check-in window as array
     */
    public function getCheckInWindowAttribute(): array
    {
        return [
            'start' => $this->check_in_start_time?->format('H:i'),
            'end' => $this->check_in_end_time?->format('H:i'),
        ];
    }

    /**
     * Get check-out window as array
     */
    public function getCheckOutWindowAttribute(): array
    {
        return [
            'start' => $this->check_out_start_time?->format('H:i'),
            'end' => $this->check_out_end_time?->format('H:i'),
        ];
    }
}
