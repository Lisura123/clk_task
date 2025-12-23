<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'start_time',
        'end_time',
        'duration_minutes',
        'description',
        'category',
        'is_billable',
        'is_manual_entry',
        'is_running',
        'edited_at',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'duration_minutes' => 'integer',
        'is_billable' => 'boolean',
        'is_manual_entry' => 'boolean',
        'is_running' => 'boolean',
        'edited_at' => 'datetime',
    ];

    /**
     * Get the task this time entry belongs to
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the user who logged this time
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for running timers
     */
    public function scopeRunning($query)
    {
        return $query->where('is_running', true);
    }

    /**
     * Scope for completed entries
     */
    public function scopeCompleted($query)
    {
        return $query->where('is_running', false)->whereNotNull('duration_minutes');
    }

    /**
     * Scope for billable entries
     */
    public function scopeBillable($query)
    {
        return $query->where('is_billable', true);
    }

    /**
     * Calculate duration if not set
     */
    public function calculateDuration()
    {
        if ($this->start_time && $this->end_time) {
            $this->duration_minutes = $this->start_time->diffInMinutes($this->end_time);
            $this->save();
        }
    }

    /**
     * Stop the timer
     */
    public function stopTimer()
    {
        $this->update([
            'end_time' => now(),
            'is_running' => false,
        ]);
        $this->calculateDuration();
    }
}
