<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRole extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'role',
        'assigned_by',
        'assigned_at',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Role constants
     */
    const ROLE_ADMIN_PROCUREMENT = 'admin_procurement';
    const ROLE_FINANCE = 'finance';
    const ROLE_BRANCH_EMPLOYEE = 'branch_employee';
    const ROLE_NONE = 'none';

    /**
     * Get the user this role belongs to
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the admin who assigned this role
     */
    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Check if this role has admin/procurement access
     */
    public function isAdminProcurement(): bool
    {
        return $this->role === self::ROLE_ADMIN_PROCUREMENT && $this->is_active;
    }

    /**
     * Check if this role has finance access
     */
    public function isFinance(): bool
    {
        return $this->role === self::ROLE_FINANCE && $this->is_active;
    }

    /**
     * Check if this role is branch employee
     */
    public function isBranchEmployee(): bool
    {
        return $this->role === self::ROLE_BRANCH_EMPLOYEE && $this->is_active;
    }

    /**
     * Check if user has any attendance access
     */
    public function hasAccess(): bool
    {
        return $this->role !== self::ROLE_NONE && $this->is_active;
    }

    /**
     * Scope to get active roles only
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by role
     */
    public function scopeByRole($query, string $role)
    {
        return $query->where('role', $role);
    }
}
