<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TaskComment;
use App\Models\Notification;
use App\Models\CommentMention;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CommentController extends Controller
{
    /**
     * Get comments for a task
     */
    public function index($taskId)
    {
        $comments = TaskComment::where('task_id', $taskId)
            ->with(['user', 'replies.user', 'mentions.user', 'attachments'])
            ->active()
            ->topLevel()
            ->oldest()
            ->get();

        // Transform comments to include user data at the root level
        $transformedComments = $comments->map(function ($comment) {
            return [
                'id' => $comment->id,
                'task_id' => $comment->task_id,
                'user_id' => $comment->user_id,
                'parent_comment_id' => $comment->parent_comment_id,
                'comment' => $comment->comment,
                'name' => $comment->user->name ?? 'Unknown User',
                'avatar' => $comment->user->profile_picture ?? null,
                'created_at' => $comment->created_at,
                'updated_at' => $comment->updated_at,
                'edited_at' => $comment->edited_at,
                'is_edited' => $comment->edited_at !== null,
                'is_deleted' => $comment->is_deleted,
                'deleted_at' => $comment->deleted_at,
                'user' => $comment->user,
                'replies' => $comment->replies->map(function ($reply) {
                    return [
                        'id' => $reply->id,
                        'task_id' => $reply->task_id,
                        'user_id' => $reply->user_id,
                        'parent_comment_id' => $reply->parent_comment_id,
                        'comment' => $reply->comment,
                        'name' => $reply->user->name ?? 'Unknown User',
                        'avatar' => $reply->user->profile_picture ?? null,
                        'created_at' => $reply->created_at,
                        'updated_at' => $reply->updated_at,
                        'edited_at' => $reply->edited_at,
                        'is_edited' => $reply->edited_at !== null,
                        'is_deleted' => $reply->is_deleted,
                        'deleted_at' => $reply->deleted_at,
                        'user' => $reply->user,
                    ];
                }),
                'mentions' => $comment->mentions,
                'attachments' => $comment->attachments,
            ];
        });

        return response()->json([
            'data' => [
                'comments' => $transformedComments
            ]
        ]);
    }

    /**
     * Create a new comment
     */
    public function store(Request $request, $taskId)
    {
        $validator = Validator::make($request->all(), [
            'comment' => 'required|string',
            'parent_comment_id' => 'nullable|exists:task_comments,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $comment = TaskComment::create([
            'task_id' => $taskId,
            'user_id' => $request->user()->id,
            'parent_comment_id' => $request->parent_comment_id,
            'comment' => $request->comment,
        ]);

        // Extract and create mentions
        $this->processMentions($comment, $request->comment);

        // Load relationships
        $comment->load(['user', 'mentions.user']);

        // Create notification for task owner/assignee
        $task = \App\Models\Task::find($taskId);
        if ($task && $task->assigned_to_id && $task->assigned_to_id !== $request->user()->id) {
            Notification::create([
                'user_id' => $task->assigned_to_id,
                'triggered_by_id' => $request->user()->id,
                'type' => 'comment_added',
                'title' => 'New Comment on Your Task',
                'message' => $request->user()->name . " commented on task: {$task->title}",
                'task_id' => $taskId,
            ]);
        }

        return response()->json([
            'message' => 'Comment added successfully',
            'comment' => [
                'id' => $comment->id,
                'task_id' => $comment->task_id,
                'user_id' => $comment->user_id,
                'parent_comment_id' => $comment->parent_comment_id,
                'comment' => $comment->comment,
                'name' => $comment->user->name ?? 'Unknown User',
                'avatar' => $comment->user->profile_picture ?? null,
                'created_at' => $comment->created_at,
                'updated_at' => $comment->updated_at,
                'edited_at' => $comment->edited_at,
                'is_edited' => $comment->edited_at !== null,
                'is_deleted' => $comment->is_deleted,
                'deleted_at' => $comment->deleted_at,
                'user' => $comment->user,
                'mentions' => $comment->mentions,
            ],
        ], 201);
    }

    /**
     * Update a comment
     */
    public function update(Request $request, $id)
    {
        $comment = TaskComment::findOrFail($id);

        if ($comment->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'comment' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $comment->update([
            'comment' => $request->comment,
            'edited_at' => now(),
        ]);

        // Update mentions
        $comment->mentions()->delete();
        $this->processMentions($comment, $request->comment);

        // Load relationships
        $comment->load(['user', 'mentions.user']);

        return response()->json([
            'message' => 'Comment updated successfully',
            'comment' => [
                'id' => $comment->id,
                'task_id' => $comment->task_id,
                'user_id' => $comment->user_id,
                'parent_comment_id' => $comment->parent_comment_id,
                'comment' => $comment->comment,
                'name' => $comment->user->name ?? 'Unknown User',
                'avatar' => $comment->user->profile_picture ?? null,
                'created_at' => $comment->created_at,
                'updated_at' => $comment->updated_at,
                'edited_at' => $comment->edited_at,
                'is_edited' => $comment->edited_at !== null,
                'is_deleted' => $comment->is_deleted,
                'deleted_at' => $comment->deleted_at,
                'user' => $comment->user,
                'mentions' => $comment->mentions,
            ],
        ]);
    }

    /**
     * Delete a comment
     */
    public function destroy(Request $request, $id)
    {
        $comment = TaskComment::findOrFail($id);

        if ($comment->user_id !== $request->user()->id && !$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $comment->update([
            'is_deleted' => true,
            'deleted_at' => now(),
            'comment' => '[This comment has been deleted]',
        ]);

        return response()->json([
            'message' => 'Comment deleted successfully',
        ]);
    }

    /**
     * Process mentions in comment
     */
    private function processMentions($comment, $text)
    {
        // Extract @mentions (e.g., @username)
        preg_match_all('/@(\w+)/', $text, $matches);
        
        if (!empty($matches[1])) {
            $usernames = array_unique($matches[1]);
            
            foreach ($usernames as $username) {
                $user = \App\Models\User::where('username', $username)->first();
                
                if ($user) {
                    CommentMention::create([
                        'comment_id' => $comment->id,
                        'user_id' => $user->id,
                    ]);

                    // Create notification for mentioned user
                    Notification::create([
                        'user_id' => $user->id,
                        'triggered_by_id' => $comment->user_id,
                        'type' => 'user_mentioned',
                        'title' => 'You were mentioned',
                        'message' => "You were mentioned in a comment on task",
                        'task_id' => $comment->task_id,
                    ]);
                }
            }
        }
    }
}
