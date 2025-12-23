<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaskTag extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'color',
        'department_id',
        'created_by',
    ];

    /**
     * Get the department this tag belongs to
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Get the user who created this tag
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get tag assignments
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(TaskTagAssignment::class, 'tag_id');
    }

    /**
     * Scope for global tags
     */
    public function scopeGlobal($query)
    {
        return $query->whereNull('department_id');
    }

    /**
     * Scope for department-specific tags
     */
    public function scopeForDepartment($query, int $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }
}
