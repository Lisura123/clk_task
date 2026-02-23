<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserBranchAssignment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'branch_id',
        'is_primary_branch',
        'assigned_by',
        'assigned_at',
        'effective_from',
        'effective_to',
        'status',
        'notes',
    ];

    protected $casts = [
        'is_primary_branch' => 'boolean',
        'assigned_at' => 'datetime',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    /**
     * Status constants
     */
    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_TRANSFERRED = 'transferred';

    /**
     * Get the user
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the branch
     */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the admin who made the assignment
     */
    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Scope to get active assignments only
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope to get primary branch assignments
     */
    public function scopePrimary($query)
    {
        return $query->where('is_primary_branch', true);
    }

    /**
     * Scope to filter by effective date
     */
    public function scopeEffectiveOn($query, $date = null)
    {
        $date = $date ?? now()->toDateString();
        
        return $query->where(function ($q) use ($date) {
            $q->whereNull('effective_from')
              ->orWhere('effective_from', '<=', $date);
        })->where(function ($q) use ($date) {
            $q->whereNull('effective_to')
              ->orWhere('effective_to', '>=', $date);
        });
    }

    /**
     * Check if assignment is currently effective
     */
    public function isEffective($date = null): bool
    {
        $date = $date ?? now()->toDateString();
        
        $fromValid = is_null($this->effective_from) || $this->effective_from <= $date;
        $toValid = is_null($this->effective_to) || $this->effective_to >= $date;
        
        return $this->status === self::STATUS_ACTIVE && $fromValid && $toValid;
    }
}
