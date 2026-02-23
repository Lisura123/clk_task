<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskLink;
use App\Models\Task;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TaskLinkController extends Controller
{
    /**
     * Get all links for a task
     */
    public function index($taskId)
    {
        $links = TaskLink::where('task_id', $taskId)
            ->with('user:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => [
                'links' => $links->map(function ($link) {
                    return [
                        'id' => $link->id,
                        'task_id' => $link->task_id,
                        'title' => $link->title,
                        'url' => $link->url,
                        'description' => $link->description,
                        'added_by' => $link->added_by,
                        'added_by_name' => $link->user->name ?? 'Unknown User',
                        'created_at' => $link->created_at,
                        'updated_at' => $link->updated_at,
                    ];
                })
            ]
        ]);
    }

    /**
     * Add a new link to a task
     */
    public function store(Request $request, $taskId)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'url' => 'required|url|max:2048',
            'description' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if task exists
        $task = Task::find($taskId);
        if (!$task) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        $link = TaskLink::create([
            'task_id' => $taskId,
            'added_by' => $request->user()->id,
            'title' => $request->title,
            'url' => $request->url,
            'description' => $request->description,
        ]);

        $link->load('user:id,name,email');

        // Create notification for task assignee
        if ($task->assigned_to_id && $task->assigned_to_id !== $request->user()->id) {
            Notification::create([
                'user_id' => $task->assigned_to_id,
                'triggered_by_id' => $request->user()->id,
                'type' => 'link_added',
                'title' => 'New Link Added to Task',
                'message' => $request->user()->name . " added a link to task: {$task->title}",
                'task_id' => $taskId,
            ]);
        }

        // Also notify task creator if different
        if ($task->created_by_id && 
            $task->created_by_id !== $request->user()->id && 
            $task->created_by_id !== $task->assigned_to_id) {
            Notification::create([
                'user_id' => $task->created_by_id,
                'triggered_by_id' => $request->user()->id,
                'type' => 'link_added',
                'title' => 'New Link Added to Task',
                'message' => $request->user()->name . " added a link to task: {$task->title}",
                'task_id' => $taskId,
            ]);
        }

        return response()->json([
            'message' => 'Link added successfully',
            'link' => [
                'id' => $link->id,
                'task_id' => $link->task_id,
                'title' => $link->title,
                'url' => $link->url,
                'description' => $link->description,
                'added_by' => $link->added_by,
                'added_by_name' => $link->user->name ?? 'Unknown User',
                'created_at' => $link->created_at,
                'updated_at' => $link->updated_at,
            ],
        ], 201);
    }

    /**
     * Update a link
     */
    public function update(Request $request, $linkId)
    {
        $link = TaskLink::findOrFail($linkId);

        // Only the person who added the link or admins can edit
        if ($link->added_by !== $request->user()->id && 
            !in_array($request->user()->role, ['admin', 'hod'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'url' => 'required|url|max:2048',
            'description' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $link->update([
            'title' => $request->title,
            'url' => $request->url,
            'description' => $request->description,
        ]);

        $link->load('user:id,name,email');

        return response()->json([
            'message' => 'Link updated successfully',
            'link' => [
                'id' => $link->id,
                'task_id' => $link->task_id,
                'title' => $link->title,
                'url' => $link->url,
                'description' => $link->description,
                'added_by' => $link->added_by,
                'added_by_name' => $link->user->name ?? 'Unknown User',
                'created_at' => $link->created_at,
                'updated_at' => $link->updated_at,
            ],
        ]);
    }

    /**
     * Delete a link
     */
    public function destroy(Request $request, $linkId)
    {
        $link = TaskLink::findOrFail($linkId);

        // Only the person who added the link or admins can delete
        if ($link->added_by !== $request->user()->id && 
            !in_array($request->user()->role, ['admin', 'hod'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $link->delete();

        return response()->json([
            'message' => 'Link deleted successfully',
        ]);
    }
}
