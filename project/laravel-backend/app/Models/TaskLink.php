<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskLink extends Model
{
    use HasFactory;

    protected $fillable = [
        'task_id',
        'added_by',
        'title',
        'url',
        'description',
    ];

    /**
     * Get the task this link belongs to
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Get the user who added this link
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
