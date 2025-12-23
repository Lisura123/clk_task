<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
    ];

    /**
     * Get the users in this department
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get the tasks for this department
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'department', 'name');
    }

    /**
     * Get the task templates for this department
     */
    public function taskTemplates(): HasMany
    {
        return $this->hasMany(TaskTemplate::class);
    }

    /**
     * Get the task tags for this department
     */
    public function taskTags(): HasMany
    {
        return $this->hasMany(TaskTag::class);
    }
}
