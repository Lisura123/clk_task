<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScheduledPlan;
use App\Models\Department;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ScheduledPlanController extends Controller
{
    /**
     * Get all scheduled plans for user's department(s)
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = ScheduledPlan::with(['creator', 'assignee', 'department']);

        // Filter by user's access
        if ($user->role === 'super_admin') {
            // Super admin sees all
        } elseif ($user->role === 'dept_admin') {
            // Dept admin sees their managed departments
            $managedDeptIds = collect($user->managed_department_ids ?? [])
                ->map(fn($id) => is_numeric($id) ? (int)$id : null)
                ->filter()
                ->toArray();
            
            if (empty($managedDeptIds) && $user->department_id) {
                $managedDeptIds = [$user->department_id];
            }
            
            $query->whereIn('department_id', $managedDeptIds);
        } else {
            // Regular employees see their department's plans
            $query->where('department_id', $user->department_id);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('scheduled_date', [$request->start_date, $request->end_date]);
        }

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Filter by type
        if ($request->has('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        // Filter by department
        if ($request->has('department_id') && $request->department_id !== 'all') {
            $query->where('department_id', $request->department_id);
        }

        $plans = $query->orderBy('scheduled_date')
            ->orderBy('start_time')
            ->get()
            ->map(function ($plan) {
                return [
                    'id' => $plan->id,
                    'title' => $plan->title,
                    'description' => $plan->description,
                    'department_id' => $plan->department_id,
                    'department_name' => $plan->department->name ?? 'Unknown',
                    'created_by' => $plan->created_by,
                    'creator_name' => $plan->creator->name ?? 'Unknown',
                    'assigned_to' => $plan->assigned_to,
                    'assignee_name' => $plan->assignee->name ?? null,
                    'scheduled_date' => $plan->scheduled_date->format('Y-m-d'),
                    'start_time' => $plan->start_time,
                    'end_time' => $plan->end_time,
                    'type' => $plan->type,
                    'status' => $plan->status,
                    'priority' => $plan->priority,
                    'is_recurring' => $plan->is_recurring,
                    'recurrence_pattern' => $plan->recurrence_pattern,
                    'recurrence_end_date' => $plan->recurrence_end_date?->format('Y-m-d'),
                    'notes' => $plan->notes,
                    'location' => $plan->location,
                    'created_at' => $plan->created_at,
                    'updated_at' => $plan->updated_at,
                ];
            });

        return response()->json($plans);
    }

    /**
     * Create a new scheduled plan
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        // Check permission
        if (!in_array($user->role, ['super_admin', 'dept_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'required|exists:departments,id',
            'assigned_to' => 'nullable|exists:users,id',
            'scheduled_date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'type' => 'required|in:meeting,task,event,deadline,reminder,other',
            'status' => 'nullable|in:pending,in_progress,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'is_recurring' => 'nullable|boolean',
            'recurrence_pattern' => 'nullable|in:daily,weekly,monthly,yearly',
            'recurrence_end_date' => 'nullable|date|after:scheduled_date',
            'notes' => 'nullable|string',
            'location' => 'nullable|string|max:255',
        ]);

        // Verify dept admin can create for this department
        if ($user->role === 'dept_admin') {
            $managedDeptIds = collect($user->managed_department_ids ?? [])
                ->map(fn($id) => is_numeric($id) ? (int)$id : null)
                ->filter()
                ->toArray();
            
            if (empty($managedDeptIds) && $user->department_id) {
                $managedDeptIds = [$user->department_id];
            }
            
            if (!in_array((int)$validated['department_id'], $managedDeptIds)) {
                return response()->json(['message' => 'You can only create plans for your managed departments'], 403);
            }
        }

        $validated['created_by'] = $user->id;
        $validated['status'] = $validated['status'] ?? 'pending';
        $validated['priority'] = $validated['priority'] ?? 'medium';

        $plan = ScheduledPlan::create($validated);

        // Notify assigned user if different from creator
        if ($plan->assigned_to && $plan->assigned_to !== $user->id) {
            Notification::create([
                'user_id' => $plan->assigned_to,
                'type' => 'plan_assigned',
                'title' => 'New Plan Assigned',
                'message' => "{$user->name} assigned you a scheduled plan: {$plan->title}",
                'data' => json_encode([
                    'plan_id' => $plan->id,
                    'scheduled_date' => $plan->scheduled_date->format('Y-m-d'),
                ]),
            ]);
        }

        return response()->json([
            'message' => 'Scheduled plan created successfully',
            'plan' => $plan->load(['creator', 'assignee', 'department']),
        ], 201);
    }

    /**
     * Get a specific scheduled plan
     */
    public function show($id)
    {
        $user = Auth::user();
        $plan = ScheduledPlan::with(['creator', 'assignee', 'department'])->findOrFail($id);

        // Check access
        if ($user->role !== 'super_admin') {
            $managedDeptIds = collect($user->managed_department_ids ?? [])
                ->map(fn($id) => is_numeric($id) ? (int)$id : null)
                ->filter()
                ->toArray();
            
            if (empty($managedDeptIds) && $user->department_id) {
                $managedDeptIds = [$user->department_id];
            }
            
            if (!in_array($plan->department_id, $managedDeptIds)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return response()->json($plan);
    }

    /**
     * Update a scheduled plan
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $plan = ScheduledPlan::findOrFail($id);

        // Check permission
        if (!in_array($user->role, ['super_admin', 'dept_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check department access
        if ($user->role === 'dept_admin') {
            $managedDeptIds = collect($user->managed_department_ids ?? [])
                ->map(fn($id) => is_numeric($id) ? (int)$id : null)
                ->filter()
                ->toArray();
            
            if (empty($managedDeptIds) && $user->department_id) {
                $managedDeptIds = [$user->department_id];
            }
            
            if (!in_array($plan->department_id, $managedDeptIds)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'scheduled_date' => 'sometimes|required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'type' => 'sometimes|required|in:meeting,task,event,deadline,reminder,other',
            'status' => 'nullable|in:pending,in_progress,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'is_recurring' => 'nullable|boolean',
            'recurrence_pattern' => 'nullable|in:daily,weekly,monthly,yearly',
            'recurrence_end_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'location' => 'nullable|string|max:255',
        ]);

        $oldAssignee = $plan->assigned_to;
        $plan->update($validated);

        // Notify if assignee changed
        if (isset($validated['assigned_to']) && $validated['assigned_to'] !== $oldAssignee && $validated['assigned_to'] !== $user->id) {
            Notification::create([
                'user_id' => $validated['assigned_to'],
                'type' => 'plan_assigned',
                'title' => 'Plan Assigned to You',
                'message' => "{$user->name} assigned you a scheduled plan: {$plan->title}",
                'data' => json_encode([
                    'plan_id' => $plan->id,
                    'scheduled_date' => $plan->scheduled_date->format('Y-m-d'),
                ]),
            ]);
        }

        return response()->json([
            'message' => 'Scheduled plan updated successfully',
            'plan' => $plan->load(['creator', 'assignee', 'department']),
        ]);
    }

    /**
     * Delete a scheduled plan
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $plan = ScheduledPlan::findOrFail($id);

        // Check permission
        if (!in_array($user->role, ['super_admin', 'dept_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check department access
        if ($user->role === 'dept_admin') {
            $managedDeptIds = collect($user->managed_department_ids ?? [])
                ->map(fn($id) => is_numeric($id) ? (int)$id : null)
                ->filter()
                ->toArray();
            
            if (empty($managedDeptIds) && $user->department_id) {
                $managedDeptIds = [$user->department_id];
            }
            
            if (!in_array($plan->department_id, $managedDeptIds)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $plan->delete();

        return response()->json(['message' => 'Scheduled plan deleted successfully']);
    }

    /**
     * Get plans for a specific month (calendar view)
     */
    public function calendar(Request $request)
    {
        $user = Auth::user();
        $year = $request->get('year', date('Y'));
        $month = $request->get('month', date('m'));

        $startDate = "{$year}-{$month}-01";
        $endDate = date('Y-m-t', strtotime($startDate));

        $query = ScheduledPlan::with(['creator', 'assignee', 'department'])
            ->whereBetween('scheduled_date', [$startDate, $endDate]);

        // Filter by user's access
        if ($user->role === 'super_admin') {
            // Super admin sees all
        } elseif ($user->role === 'dept_admin') {
            $managedDeptIds = collect($user->managed_department_ids ?? [])
                ->map(fn($id) => is_numeric($id) ? (int)$id : null)
                ->filter()
                ->toArray();
            
            if (empty($managedDeptIds) && $user->department_id) {
                $managedDeptIds = [$user->department_id];
            }
            
            $query->whereIn('department_id', $managedDeptIds);
        } else {
            $query->where('department_id', $user->department_id);
        }

        // Filter by department if specified
        if ($request->has('department_id') && $request->department_id !== 'all') {
            $query->where('department_id', $request->department_id);
        }

        $plans = $query->orderBy('scheduled_date')
            ->orderBy('start_time')
            ->get();

        // Group plans by date for calendar view
        $calendarData = [];
        foreach ($plans as $plan) {
            $date = $plan->scheduled_date->format('Y-m-d');
            if (!isset($calendarData[$date])) {
                $calendarData[$date] = [];
            }
            $calendarData[$date][] = [
                'id' => $plan->id,
                'title' => $plan->title,
                'type' => $plan->type,
                'status' => $plan->status,
                'priority' => $plan->priority,
                'start_time' => $plan->start_time,
                'end_time' => $plan->end_time,
                'assignee_name' => $plan->assignee->name ?? null,
            ];
        }

        return response()->json([
            'year' => (int)$year,
            'month' => (int)$month,
            'plans' => $calendarData,
        ]);
    }

    /**
     * Get upcoming plans for dashboard widget
     */
    public function upcoming(Request $request)
    {
        $user = Auth::user();
        $limit = $request->get('limit', 5);

        $query = ScheduledPlan::with(['creator', 'assignee', 'department'])
            ->where('scheduled_date', '>=', now()->toDateString())
            ->whereIn('status', ['pending', 'in_progress']);

        // Filter by user's access
        if ($user->role === 'super_admin') {
            // Super admin sees all
        } elseif ($user->role === 'dept_admin') {
            $managedDeptIds = collect($user->managed_department_ids ?? [])
                ->map(fn($id) => is_numeric($id) ? (int)$id : null)
                ->filter()
                ->toArray();
            
            if (empty($managedDeptIds) && $user->department_id) {
                $managedDeptIds = [$user->department_id];
            }
            
            $query->whereIn('department_id', $managedDeptIds);
        } else {
            $query->where(function ($q) use ($user) {
                $q->where('department_id', $user->department_id)
                  ->orWhere('assigned_to', $user->id);
            });
        }

        $plans = $query->orderBy('scheduled_date')
            ->orderBy('start_time')
            ->limit($limit)
            ->get();

        return response()->json($plans);
    }
}
