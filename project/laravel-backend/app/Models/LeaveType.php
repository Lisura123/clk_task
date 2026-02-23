<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'default_days_per_year',
        'is_paid',
        'requires_attachment',
        'max_consecutive_days',
        'min_notice_days',
        'is_active',
        'color',
    ];

    protected $casts = [
        'default_days_per_year' => 'integer',
        'is_paid' => 'boolean',
        'requires_attachment' => 'boolean',
        'max_consecutive_days' => 'integer',
        'min_notice_days' => 'integer',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Helper methods
    public function getAvailableDaysForUser($userId, $year = null)
    {
        $year = $year ?? date('Y');
        
        $balance = LeaveBalance::where('user_id', $userId)
            ->where('leave_type_id', $this->id)
            ->where('year', $year)
            ->first();

        if (!$balance) {
            return $this->default_days_per_year;
        }

        return $balance->allocated_days + $balance->carried_over - $balance->used_days - $balance->pending_days;
    }
}
