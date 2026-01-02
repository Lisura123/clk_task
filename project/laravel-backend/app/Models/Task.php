<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'department',
        'assigned_to_id',
        'created_by_id',
        'priority',
        'status',
        'progress',
        'due_date',
        'estimated_hours',
        'is_archived',
        'archived_at',
        'completed_at',
    ];

    protected $casts = [
        'due_date' => 'date',
        'estimated_hours' => 'decimal:2',
        'progress' => 'integer',
        'is_archived' => 'boolean',
        'archived_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected $appends = ['assigned_to_name', 'created_by_name'];

    /**
     * Get the assigned user's name
     */
    public function getAssignedToNameAttribute()
    {
        return $this->assignedTo?->username ?? $this->assignedTo?->name;
    }

    /**
     * Get the creator's name
     */
    public function getCreatedByNameAttribute()
    {
        return $this->createdBy?->username ?? $this->createdBy?->name;
    }

    /**
     * Get the user assigned to this task
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    /**
     * Get the user who created this task
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    /**
     * Get comments for this task
     */
    public function comments(): HasMany
    {
        return $this->hasMany(TaskComment::class);
    }

    /**
     * Get attachments for this task
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(TaskAttachment::class);
    }

    /**
     * Get activities for this task
     */
    public function activities(): HasMany
    {
        return $this->hasMany(TaskActivity::class);
    }

    /**
     * Get time entries for this task
     */
    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    /**
     * Get watchers for this task
     */
    public function watchers(): HasMany
    {
        return $this->hasMany(TaskWatcher::class);
    }

    /**
     * Get tag assignments for this task
     */
    public function tagAssignments(): HasMany
    {
        return $this->hasMany(TaskTagAssignment::class);
    }

    /**
     * Get tags through tag assignments
     */
    public function tags()
    {
        return $this->hasManyThrough(
            TaskTag::class,
            TaskTagAssignment::class,
            'task_id',
            'id',
            'id',
            'tag_id'
        );
    }

    /**
     * Get notifications for this task
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get daily work logs for this task
     */
    public function workLogs(): HasMany
    {
        return $this->hasMany(DailyWorkLog::class);
    }

    /**
     * Scope for active tasks (not archived)
     */
    public function scopeActive($query)
    {
        return $query->where('is_archived', false);
    }

    /**
     * Scope for completed tasks
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope for tasks by department
     */
    public function scopeByDepartment($query, string $department)
    {
        return $query->where('department', $department);
    }

    /**
     * Scope for tasks assigned to a user
     */
    public function scopeAssignedToUser($query, int $userId)
    {
        return $query->where('assigned_to_id', $userId);
    }

    /**
     * Calculate total time logged
     */
    public function totalTimeLogged()
    {
        return $this->timeEntries()->sum('duration_minutes');
    }
}
