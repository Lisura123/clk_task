<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskActivity extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'user_id',
        'activity_type',
        'description',
        'metadata',
        'is_system_generated',
    ];

    protected $casts = [
        'metadata' => 'array',
        'is_system_generated' => 'boolean',
    ];

    /**
     * Get the task this activity belongs to
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the user who performed this activity
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for system-generated activities
     */
    public function scopeSystemGenerated($query)
    {
        return $query->where('is_system_generated', true);
    }

    /**
     * Scope for user-generated activities
     */
    public function scopeUserGenerated($query)
    {
        return $query->where('is_system_generated', false);
    }

    /**
     * Scope for activities by type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('activity_type', $type);
    }
}
