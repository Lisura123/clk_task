<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaskTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'department_id',
        'template_name',
        'description',
        'default_priority',
        'estimated_hours',
    ];

    protected $casts = [
        'estimated_hours' => 'decimal:2',
    ];

    /**
     * Get the department this template belongs to
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}
