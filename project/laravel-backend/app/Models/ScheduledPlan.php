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
        'group_id',
        'created_by',
        'start_date',
        'end_date',
        'is_recurring',
        'recurrence_pattern',
        'recurrence_end_date',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'recurrence_end_date' => 'date',
        'is_recurring' => 'boolean',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get employees related to this plan
     * If plan has a group, return group members
     * Otherwise return department employees
     */
    public function getEmployeesAttribute()
    {
        if ($this->group_id && $this->relationLoaded('group') && $this->group) {
            return $this->group->members;
        }
        
        if ($this->department_id && $this->relationLoaded('department') && $this->department) {
            return $this->department->users()
                ->whereIn('role', ['employee', 'senior_employee', 'hod'])
                ->where('status', 'active')
                ->get();
        }
        
        return collect([]);
    }

    public function dailyEntries()
    {
        return $this->hasMany(PlanDailyEntry::class);
    }

    public function getDailyEntryForDate($date)
    {
        return $this->dailyEntries()->where('entry_date', $date)->first();
    }

    // Get plans for a specific date range
    public static function getForDateRange($departmentId, $startDate, $endDate)
    {
        return static::where('department_id', $departmentId)
            ->where(function($query) use ($startDate, $endDate) {
                $query->whereBetween('start_date', [$startDate, $endDate])
                    ->orWhereBetween('end_date', [$startDate, $endDate])
                    ->orWhere(function($q) use ($startDate, $endDate) {
                        $q->where('start_date', '<=', $startDate)
                          ->where('end_date', '>=', $endDate);
                    });
            })
            ->with(['creator', 'department'])
            ->orderBy('start_date')
            ->get();
    }
}
