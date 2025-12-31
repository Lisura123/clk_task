<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'content',
        'group_id',
        'created_by',
        'status',
        'priority',
        'start_date',
        'end_date',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    /**
     * Get the group that owns the plan.
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    /**
     * Get the user who created the plan.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope to filter only published plans.
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    /**
     * Scope to filter plans by group.
     */
    public function scopeForGroup($query, $groupId)
    {
        return $query->where('group_id', $groupId);
    }

    /**
     * Scope to filter plans accessible by a user (member of the group).
     */
    public function scopeAccessibleBy($query, User $user)
    {
        $groupIds = $user->groups()->pluck('groups.id');
        return $query->whereIn('group_id', $groupIds);
    }
}
