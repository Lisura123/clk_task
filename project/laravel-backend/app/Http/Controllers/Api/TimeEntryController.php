<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimeEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class TimeEntryController extends Controller
{
    /**
     * Get time entries for a task
     */
    public function index($taskId)
    {
        $entries = TimeEntry::where('task_id', $taskId)
            ->with('user')
            ->latest('start_time')
            ->get();

        return response()->json($entries);
    }

    /**
     * Start a timer
     */
    public function startTimer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'task_id' => 'required|exists:tasks,id',
            'description' => 'nullable|string',
            'category' => 'nullable|in:development,testing,documentation,design,meeting,review,deployment,planning,other',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if user already has a running timer
        $existingTimer = TimeEntry::where('user_id', $request->user()->id)
            ->running()
            ->first();

        if ($existingTimer) {
            return response()->json([
                'message' => 'You already have a running timer. Please stop it first.',
                'timer' => $existingTimer,
            ], 422);
        }

        $entry = TimeEntry::create([
            'task_id' => $request->task_id,
            'user_id' => $request->user()->id,
            'start_time' => now(),
            'description' => $request->description,
            'category' => $request->category ?? 'other',
            'is_running' => true,
            'is_manual_entry' => false,
        ]);

        return response()->json([
            'message' => 'Timer started successfully',
            'entry' => $entry,
        ], 201);
    }

    /**
     * Stop a timer
     */
    public function stopTimer(Request $request, $id)
    {
        $entry = TimeEntry::where('user_id', $request->user()->id)
            ->findOrFail($id);

        if (!$entry->is_running) {
            return response()->json(['message' => 'Timer is not running'], 422);
        }

        $entry->stopTimer();

        return response()->json([
            'message' => 'Timer stopped successfully',
            'entry' => $entry,
        ]);
    }

    /**
     * Get running timer for current user
     */
    public function getRunningTimer(Request $request)
    {
        $timer = TimeEntry::where('user_id', $request->user()->id)
            ->with('task')
            ->running()
            ->first();

        return response()->json($timer);
    }

    /**
     * Create manual time entry
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'task_id' => 'required|exists:tasks,id',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'description' => 'nullable|string',
            'category' => 'required|in:development,testing,documentation,design,meeting,review,deployment,planning,other',
            'is_billable' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $start = Carbon::parse($request->start_time);
        $end = Carbon::parse($request->end_time);
        $duration = $start->diffInMinutes($end);

        $entry = TimeEntry::create([
            'task_id' => $request->task_id,
            'user_id' => $request->user()->id,
            'start_time' => $start,
            'end_time' => $end,
            'duration_minutes' => $duration,
            'description' => $request->description,
            'category' => $request->category,
            'is_billable' => $request->is_billable ?? false,
            'is_manual_entry' => true,
            'is_running' => false,
        ]);

        return response()->json([
            'message' => 'Time entry created successfully',
            'entry' => $entry,
        ], 201);
    }

    /**
     * Update time entry
     */
    public function update(Request $request, $id)
    {
        $entry = TimeEntry::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date',
            'description' => 'sometimes|nullable|string',
            'category' => 'sometimes|in:development,testing,documentation,design,meeting,review,deployment,planning,other',
            'is_billable' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $entry->update($request->all());
        
        if ($request->has('start_time') || $request->has('end_time')) {
            $entry->calculateDuration();
        }

        $entry->update(['edited_at' => now()]);

        return response()->json([
            'message' => 'Time entry updated successfully',
            'entry' => $entry,
        ]);
    }

    /**
     * Delete time entry
     */
    public function destroy(Request $request, $id)
    {
        $entry = TimeEntry::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $entry->delete();

        return response()->json([
            'message' => 'Time entry deleted successfully',
        ]);
    }

    /**
     * Get time summary for user
     */
    public function summary(Request $request)
    {
        $userId = $request->get('user_id', $request->user()->id);
        $startDate = $request->get('start_date', now()->startOfMonth());
        $endDate = $request->get('end_date', now()->endOfMonth());

        $query = TimeEntry::where('user_id', $userId)
            ->whereBetween('start_time', [$startDate, $endDate])
            ->completed();

        $summary = [
            'total_minutes' => $query->sum('duration_minutes'),
            'total_hours' => round($query->sum('duration_minutes') / 60, 2),
            'billable_minutes' => $query->where('is_billable', true)->sum('duration_minutes'),
            'billable_hours' => round($query->where('is_billable', true)->sum('duration_minutes') / 60, 2),
            'entries_count' => $query->count(),
            'by_category' => $query->get()->groupBy('category')->map(function ($items) {
                return [
                    'count' => $items->count(),
                    'minutes' => $items->sum('duration_minutes'),
                    'hours' => round($items->sum('duration_minutes') / 60, 2),
                ];
            }),
        ];

        return response()->json($summary);
    }
}
