<?php

namespace App\Http\Controllers;

use App\Models\PlanDailyEntry;
use App\Models\ScheduledPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PlanDailyEntryController extends Controller
{
    /**
     * Get daily entry for a specific plan and date
     */
    public function show(Request $request, $planId, $date)
    {
        $plan = ScheduledPlan::findOrFail($planId);
        
        // Check if user has access to this plan's department
        $user = Auth::user();
        if (!$this->canAccessPlan($user, $plan)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $entry = PlanDailyEntry::where('scheduled_plan_id', $planId)
            ->where('entry_date', $date)
            ->with('updatedByUser')
            ->first();

        if (!$entry) {
            // Return empty entry structure
            return response()->json([
                'scheduled_plan_id' => (int) $planId,
                'entry_date' => $date,
                'todo_items' => [],
                'done_items' => [],
                'daily_notes' => '',
                'exists' => false
            ]);
        }

        return response()->json([
            ...$entry->toArray(),
            'updated_by_name' => $entry->updatedByUser?->name,
            'exists' => true
        ]);
    }

    /**
     * Update or create daily entry for a specific plan and date
     */
    public function update(Request $request, $planId, $date)
    {
        $plan = ScheduledPlan::findOrFail($planId);
        
        // Check if user can manage this plan
        $user = Auth::user();
        if (!$this->canManagePlan($user, $plan)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Validate that date is within plan's date range
        $entryDate = \Carbon\Carbon::parse($date);
        $startDate = \Carbon\Carbon::parse($plan->start_date);
        $endDate = $plan->end_date ? \Carbon\Carbon::parse($plan->end_date) : $startDate;

        if ($entryDate < $startDate || $entryDate > $endDate) {
            return response()->json([
                'message' => 'Entry date must be within the plan date range'
            ], 422);
        }

        $validated = $request->validate([
            'todo_items' => 'nullable|array',
            'todo_items.*' => 'string|max:500',
            'done_items' => 'nullable|array',
            'done_items.*' => 'string|max:500',
            'daily_notes' => 'nullable|string|max:2000'
        ]);

        $entry = PlanDailyEntry::updateOrCreate(
            [
                'scheduled_plan_id' => $planId,
                'entry_date' => $date
            ],
            [
                'todo_items' => $validated['todo_items'] ?? [],
                'done_items' => $validated['done_items'] ?? [],
                'daily_notes' => $validated['daily_notes'] ?? '',
                'updated_by' => $user->id
            ]
        );

        $entry->load('updatedByUser');

        return response()->json([
            'message' => 'Daily entry updated successfully',
            'entry' => [
                ...$entry->toArray(),
                'updated_by_name' => $entry->updatedByUser?->name,
                'exists' => true
            ]
        ]);
    }

    /**
     * Get all daily entries for a plan
     */
    public function index(Request $request, $planId)
    {
        $plan = ScheduledPlan::findOrFail($planId);
        
        $user = Auth::user();
        if (!$this->canAccessPlan($user, $plan)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $entries = PlanDailyEntry::where('scheduled_plan_id', $planId)
            ->with('updatedByUser')
            ->orderBy('entry_date')
            ->get()
            ->map(function ($entry) {
                return [
                    ...$entry->toArray(),
                    'updated_by_name' => $entry->updatedByUser?->name
                ];
            });

        return response()->json($entries);
    }

    /**
     * Check if user can access the plan (view)
     */
    private function canAccessPlan($user, $plan)
    {
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'dept_admin') {
            $managedIds = is_array($user->managed_department_ids) 
                ? $user->managed_department_ids 
                : json_decode($user->managed_department_ids, true) ?? [];
            return in_array($plan->department_id, $managedIds);
        }

        return $user->department_id === $plan->department_id;
    }

    /**
     * Check if user can manage the plan (edit)
     */
    private function canManagePlan($user, $plan)
    {
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'dept_admin') {
            $managedIds = is_array($user->managed_department_ids) 
                ? $user->managed_department_ids 
                : json_decode($user->managed_department_ids, true) ?? [];
            return in_array($plan->department_id, $managedIds);
        }

        return false;
    }
}
