<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\GroupMessage;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GroupMessageController extends Controller
{
    /**
     * Get messages for a group.
     */
    public function index(Request $request, Group $group)
    {
        $user = Auth::user();

        // Check if user has access to this group
        if (!$this->canAccessGroup($user, $group)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $perPage = $request->input('per_page', 50);
        $before = $request->input('before'); // For pagination (load older messages)

        $query = $group->messages()
            ->with(['user:id,name,email,profile_picture,role', 'replyTo:id,message,user_id', 'replyTo.user:id,name'])
            ->orderBy('created_at', 'desc');

        if ($before) {
            $query->where('id', '<', $before);
        }

        $messages = $query->paginate($perPage);

        return response()->json($messages);
    }

    /**
     * Send a message to a group.
     */
    public function store(Request $request, Group $group)
    {
        $user = Auth::user();

        // Check if user has access to this group
        if (!$this->canAccessGroup($user, $group)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
            'reply_to_id' => 'nullable|exists:group_messages,id',
        ]);

        // If replying, verify the reply_to message belongs to the same group
        if (!empty($validated['reply_to_id'])) {
            $replyMessage = GroupMessage::find($validated['reply_to_id']);
            if (!$replyMessage || $replyMessage->group_id !== $group->id) {
                return response()->json(['error' => 'Invalid reply target'], 400);
            }
        }

        $message = $group->messages()->create([
            'user_id' => $user->id,
            'message' => $validated['message'],
            'reply_to_id' => $validated['reply_to_id'] ?? null,
        ]);

        // Notify all group members except the sender
        $groupMembers = $group->members()->where('users.id', '!=', $user->id)->pluck('users.id');
        foreach ($groupMembers as $memberId) {
            Notification::create([
                'user_id' => $memberId,
                'triggered_by_id' => $user->id,
                'type' => 'group_message',
                'title' => "New message in {$group->name}",
                'message' => $user->name . ": " . \Str::limit($validated['message'], 50),
                'task_id' => null,
            ]);
        }

        return response()->json([
            'message' => 'Message sent successfully',
            'data' => $message->load(['user:id,name,email,profile_picture,role', 'replyTo:id,message,user_id', 'replyTo.user:id,name']),
        ], 201);
    }

    /**
     * Update a message.
     */
    public function update(Request $request, Group $group, GroupMessage $message)
    {
        $user = Auth::user();

        // Check if user has access to this group
        if (!$this->canAccessGroup($user, $group)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Ensure message belongs to this group
        if ($message->group_id !== $group->id) {
            return response()->json(['error' => 'Message not found'], 404);
        }

        // Only the message author can edit their own message
        if ($message->user_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $message->update([
            'message' => $validated['message'],
            'is_edited' => true,
        ]);

        return response()->json([
            'message' => 'Message updated successfully',
            'data' => $message->fresh()->load(['user:id,name,email,profile_picture,role', 'replyTo:id,message,user_id', 'replyTo.user:id,name']),
        ]);
    }

    /**
     * Delete a message.
     */
    public function destroy(Group $group, GroupMessage $message)
    {
        $user = Auth::user();

        // Check if user has access to this group
        if (!$this->canAccessGroup($user, $group)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Ensure message belongs to this group
        if ($message->group_id !== $group->id) {
            return response()->json(['error' => 'Message not found'], 404);
        }

        // Allow deletion by: message author, group creator (dept admin), or super admin
        $canDelete = $message->user_id === $user->id 
            || $user->role === 'admin'
            || ($user->role === 'hod' && $group->created_by === $user->id);

        if (!$canDelete) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $message->delete();

        return response()->json(['message' => 'Message deleted successfully']);
    }

    /**
     * Check if user can access a group.
     */
    private function canAccessGroup($user, Group $group): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'hod') {
            // Dept admin can access groups they created
            if ($group->created_by === $user->id) {
                return true;
            }
            // Or groups in their managed departments
            $managedDeptIds = $user->managed_department_ids ?? [];
            if (in_array($group->department_id, $managedDeptIds)) {
                return true;
            }
        }

        // Check if user is a member of the group
        return $group->members()->where('user_id', $user->id)->exists();
    }
}
