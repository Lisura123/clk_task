<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'leave_type_id',
        'year',
        'allocated_days',
        'used_days',
        'pending_days',
        'carried_over',
    ];

    protected $casts = [
        'year' => 'integer',
        'allocated_days' => 'decimal:1',
        'used_days' => 'decimal:1',
        'pending_days' => 'decimal:1',
        'carried_over' => 'decimal:1',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    // Calculated attributes
    public function getAvailableDaysAttribute()
    {
        return $this->allocated_days + $this->carried_over - $this->used_days - $this->pending_days;
    }

    public function getTotalEntitlementAttribute()
    {
        return $this->allocated_days + $this->carried_over;
    }

    // Static methods
    public static function initializeForUser($userId, $year = null)
    {
        $year = $year ?? date('Y');
        $leaveTypes = LeaveType::active()->get();

        foreach ($leaveTypes as $leaveType) {
            self::firstOrCreate(
                [
                    'user_id' => $userId,
                    'leave_type_id' => $leaveType->id,
                    'year' => $year,
                ],
                [
                    'allocated_days' => $leaveType->default_days_per_year,
                    'used_days' => 0,
                    'pending_days' => 0,
                    'carried_over' => 0,
                ]
            );
        }
    }

    public static function getBalancesForUser($userId, $year = null)
    {
        $year = $year ?? date('Y');
        
        // Initialize balances if not exists
        self::initializeForUser($userId, $year);

        return self::where('user_id', $userId)
            ->where('year', $year)
            ->with('leaveType')
            ->get();
    }
}
