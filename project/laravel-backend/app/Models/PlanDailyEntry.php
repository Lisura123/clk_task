<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlanDailyEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'scheduled_plan_id',
        'entry_date',
        'todo_items',
        'done_items',
        'daily_notes',
        'updated_by'
    ];

    protected $casts = [
        'entry_date' => 'date',
        'todo_items' => 'array',
        'done_items' => 'array'
    ];

    public function scheduledPlan()
    {
        return $this->belongsTo(ScheduledPlan::class);
    }

    public function updatedByUser()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
