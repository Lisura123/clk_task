<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyWorkLog;
use App\Models\Task;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class DailyWorkLogController extends Controller
{
    /**
     * Get work logs for a task.
     */
    public function index(Request $request, Task $task)
    {
        $user = Auth::user();

        // Check access to task
        if (!$this->canAccessTask($user, $task)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $query = $task->workLogs()->with(['user:id,name,email,profile_picture']);

        // Filter by date range
        if ($request->has('from')) {
            $query->where('work_date', '>=', $request->from);
        }
        if ($request->has('to')) {
            $query->where('work_date', '<=', $request->to);
        }

        // Filter by user (for admins viewing specific user's logs)
        if ($request->has('user_id') && ($user->role === 'super_admin' || $user->role === 'dept_admin')) {
            $query->where('user_id', $request->user_id);
        }

        $logs = $query->orderBy('work_date', 'desc')->orderBy('created_at', 'desc')->get();

        return response()->json($logs);
    }

    /**
     * Get all work logs for the current user (across all tasks).
     */
    public function myLogs(Request $request)
    {
        $user = Auth::user();

        $query = DailyWorkLog::with(['task:id,title,status,priority', 'user:id,name'])
            ->where('user_id', $user->id);

        // Filter by date range
        if ($request->has('from')) {
            $query->where('work_date', '>=', $request->from);
        }
        if ($request->has('to')) {
            $query->where('work_date', '<=', $request->to);
        }

        // Filter by task
        if ($request->has('task_id')) {
            $query->where('task_id', $request->task_id);
        }

        $logs = $query->orderBy('work_date', 'desc')->orderBy('created_at', 'desc')->get();

        return response()->json($logs);
    }

    /**
     * Get work logs summary for admins (all users).
     */
    public function summary(Request $request)
    {
        $user = Auth::user();

        if ($user->role !== 'super_admin' && $user->role !== 'dept_admin') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $query = DailyWorkLog::with(['task:id,title,department', 'user:id,name,department_id']);

        // Filter by date range
        $from = $request->input('from', now()->startOfWeek()->toDateString());
        $to = $request->input('to', now()->endOfWeek()->toDateString());
        $query->whereBetween('work_date', [$from, $to]);

        // For dept admin, filter by their departments
        if ($user->role === 'dept_admin') {
            $managedDeptIds = $user->managed_department_ids ?? [];
            if (empty($managedDeptIds) && $user->department_id) {
                $managedDeptIds = [$user->department_id];
            }
            
            $query->whereHas('user', function ($q) use ($managedDeptIds) {
                $q->whereIn('department_id', $managedDeptIds);
            });
        }

        $logs = $query->orderBy('work_date', 'desc')->get();

        // Group by user and date
        $grouped = $logs->groupBy('user_id')->map(function ($userLogs) {
            $user = $userLogs->first()->user;
            return [
                'user' => $user,
                'total_hours' => $userLogs->sum('hours_worked'),
                'logs_count' => $userLogs->count(),
                'logs' => $userLogs,
            ];
        });

        return response()->json([
            'from' => $from,
            'to' => $to,
            'summary' => $grouped->values(),
        ]);
    }

    /**
     * Create a new work log.
     */
    public function store(Request $request, Task $task)
    {
        $user = Auth::user();

        // Only assigned user can log work (or task creator)
        if ($task->assigned_to_id !== $user->id && $task->created_by_id !== $user->id) {
            return response()->json(['error' => 'You can only log work on tasks assigned to you'], 403);
        }

        $validated = $request->validate([
            'work_date' => 'required|date|before_or_equal:today',
            'description' => 'required|string|max:2000',
            'hours_worked' => 'nullable|numeric|min:0|max:24',
            'progress_percentage' => 'nullable|integer|min:0|max:100',
            'status' => ['nullable', Rule::in(['in_progress', 'completed', 'blocked', 'need_review'])],
            'blockers' => 'nullable|string|max:1000',
        ]);

        $log = $task->workLogs()->create([
            'user_id' => $user->id,
            'work_date' => $validated['work_date'],
            'description' => $validated['description'],
            'hours_worked' => $validated['hours_worked'] ?? null,
            'progress_percentage' => $validated['progress_percentage'] ?? null,
            'status' => $validated['status'] ?? 'in_progress',
            'blockers' => $validated['blockers'] ?? null,
        ]);

        // Update task progress if provided
        if (isset($validated['progress_percentage'])) {
            $task->update(['progress' => $validated['progress_percentage']]);
        }

        // Notify task creator if different from logger and status is blocked/need_review
        if ($task->created_by_id !== $user->id && in_array($validated['status'] ?? '', ['blocked', 'need_review'])) {
            Notification::create([
                'user_id' => $task->created_by_id,
                'triggered_by_id' => $user->id,
                'type' => 'work_log_update',
                'title' => 'Work Log Update',
                'message' => "{$user->name} logged work on task '{$task->title}' with status: " . ($validated['status'] ?? 'in_progress'),
                'task_id' => $task->id,
            ]);
        }

        return response()->json([
            'message' => 'Work log created successfully',
            'data' => $log->load('user:id,name,email,profile_picture'),
        ], 201);
    }

    /**
     * Update a work log.
     */
    public function update(Request $request, Task $task, DailyWorkLog $log)
    {
        $user = Auth::user();

        // Only the log creator can update it
        if ($log->user_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Verify log belongs to task
        if ($log->task_id !== $task->id) {
            return response()->json(['error' => 'Work log not found'], 404);
        }

        $validated = $request->validate([
            'work_date' => 'sometimes|date|before_or_equal:today',
            'description' => 'sometimes|required|string|max:2000',
            'hours_worked' => 'nullable|numeric|min:0|max:24',
            'progress_percentage' => 'nullable|integer|min:0|max:100',
            'status' => ['nullable', Rule::in(['in_progress', 'completed', 'blocked', 'need_review'])],
            'blockers' => 'nullable|string|max:1000',
        ]);

        $log->update($validated);

        // Update task progress if provided
        if (isset($validated['progress_percentage'])) {
            $task->update(['progress' => $validated['progress_percentage']]);
        }

        return response()->json([
            'message' => 'Work log updated successfully',
            'data' => $log->fresh()->load('user:id,name,email,profile_picture'),
        ]);
    }

    /**
     * Delete a work log.
     */
    public function destroy(Task $task, DailyWorkLog $log)
    {
        $user = Auth::user();

        // Only the log creator or admin can delete
        $canDelete = $log->user_id === $user->id || $user->role === 'super_admin';
        
        if (!$canDelete) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Verify log belongs to task
        if ($log->task_id !== $task->id) {
            return response()->json(['error' => 'Work log not found'], 404);
        }

        $log->delete();

        return response()->json(['message' => 'Work log deleted successfully']);
    }

    /**
     * Check if user can access a task.
     */
    private function canAccessTask($user, Task $task): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        if ($user->role === 'dept_admin') {
            // Check if task is in their department
            $managedDeptIds = $user->managed_department_ids ?? [];
            if (empty($managedDeptIds) && $user->department_id) {
                $managedDeptIds = [$user->department_id];
            }
            
            // Get department names for comparison
            foreach ($managedDeptIds as $deptId) {
                $dept = \App\Models\Department::find($deptId);
                if ($dept && $dept->name === $task->department) {
                    return true;
                }
            }
        }

        // Check if user is assigned or creator
        return $task->assigned_to_id === $user->id || $task->created_by_id === $user->id;
    }
}
