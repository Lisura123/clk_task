<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScheduledPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'department_id',
        'created_by',
        'assigned_to',
        'scheduled_date',
        'start_time',
        'end_time',
        'type',
        'status',
        'priority',
        'is_recurring',
        'recurrence_pattern',
        'recurrence_end_date',
        'notes',
        'location',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'recurrence_end_date' => 'date',
        'is_recurring' => 'boolean',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    // Get plans for a specific date range
    public static function getForDateRange($departmentId, $startDate, $endDate)
    {
        return static::where('department_id', $departmentId)
            ->whereBetween('scheduled_date', [$startDate, $endDate])
            ->with(['creator', 'assignee'])
            ->orderBy('scheduled_date')
            ->orderBy('start_time')
            ->get();
    }
}
