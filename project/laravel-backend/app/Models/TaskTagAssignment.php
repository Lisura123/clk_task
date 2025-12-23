<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskTagAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'tag_id',
        'assigned_by',
    ];

    /**
     * Get the task
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the tag
     */
    public function tag(): BelongsTo
    {
        return $this->belongsTo(TaskTag::class);
    }

    /**
     * Get the user who assigned the tag
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
