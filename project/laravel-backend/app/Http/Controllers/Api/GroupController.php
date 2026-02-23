<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GroupController extends Controller
{
    /**
     * Get all groups
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Group::with(['department', 'creator', 'members']);

        // Filter based on user role
        // Admins can see all groups
        // HODs can see all groups (for cross-department collaboration)
        // All employees (including senior employees) see only groups they are members of or created
        if ($user->isAdmin()) {
            // Admin sees all groups
        } elseif ($user->isHod()) {
            // HODs can see all groups (for cross-department collaboration)
        } else {
            // All Employees (including Senior Employees) see only groups they're involved in
            $query->where(function($q) use ($user) {
                $q->whereHas('members', function($mq) use ($user) {
                    $mq->where('users.id', $user->id);
                })->orWhere('created_by', $user->id);
            });
        }

        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $groups = $query->latest()->get();

        // Add member count to each group
        $groups->transform(function ($group) {
            $group->member_count = $group->members()->count();
            return $group;
        });

        return response()->json([
            'data' => $groups
        ]);
    }

    /**
     * Create a new group
     */
    public function store(Request $request)
    {
        $user = $request->user();

        // Only regular employees cannot create groups
        // Admin, HOD, and Senior Employee can all create groups
        if ($user->isEmployee() && !$user->isSeniorEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'department_id' => 'required|exists:departments,id',
            'member_ids' => 'required|array|min:2|max:50',
            'member_ids.*' => 'exists:users,id',
            'leader_ids' => 'required|array|min:1',
            'leader_ids.*' => 'exists:users,id',
        ], [
            'member_ids.min' => 'A group must have at least 2 members',
            'member_ids.max' => 'A group cannot have more than 50 members',
            'leader_ids.required' => 'A group must have at least one leader',
            'leader_ids.min' => 'A group must have at least one leader',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if group name already exists in this department
        $existingGroup = Group::where('department_id', $request->department_id)
            ->where('name', $request->name)
            ->first();
        
        if ($existingGroup) {
            return response()->json([
                'message' => 'A group with this name already exists in this department'
            ], 422);
        }

        // Admin, HOD, and Senior Employees can create groups in ANY department
        // No department restriction for group creation

        // Verify all leader_ids are in member_ids
        $invalidLeaders = array_diff($request->leader_ids ?? [], $request->member_ids);
        if (!empty($invalidLeaders)) {
            return response()->json([
                'message' => 'All leaders must be members of the group'
            ], 422);
        }

        // Admin, HOD, and Senior Employees can add members from any department
        // Skip department validation for members

        $group = Group::create([
            'name' => $request->name,
            'description' => $request->description,
            'department_id' => $request->department_id,
            'created_by' => $user->id,
        ]);

        // Add members
        $memberData = [];
        foreach ($request->member_ids as $memberId) {
            $role = in_array($memberId, $request->leader_ids ?? []) ? 'leader' : 'member';
            $memberData[$memberId] = ['role' => $role];
        }
        $group->members()->attach($memberData);

        return response()->json([
            'message' => 'Group created successfully',
            'data' => $group->load(['members', 'department']),
        ], 201);
    }

    /**
     * Get a single group
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $group = Group::with(['department', 'creator', 'members'])->find($id);

        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        // Check access based on role
        if ($user->isAdmin() || $user->isSeniorEmployee() || $user->isHod()) {
            // Admin, Senior Employee, and HOD can see all groups
        } else {
            // Regular Employees can only see groups they are members of
            $isMember = $group->members()->where('users.id', $user->id)->exists();
            if (!$isMember) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return response()->json([
            'data' => $group
        ]);
    }

    /**
     * Update a group
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $group = Group::find($id);

        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        // Only regular employees cannot update groups
        if ($user->isEmployee() && !$user->isSeniorEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Admin, HOD, and Senior Employees can update groups in ANY department

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'member_ids' => 'sometimes|array|min:2|max:50',
            'member_ids.*' => 'exists:users,id',
            'leader_ids' => 'sometimes|array|min:1',
            'leader_ids.*' => 'exists:users,id',
            'is_active' => 'sometimes|boolean',
        ], [
            'member_ids.min' => 'A group must have at least 2 members',
            'member_ids.max' => 'A group cannot have more than 50 members',
            'leader_ids.min' => 'A group must have at least one leader',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if name is being updated and if it conflicts
        if ($request->has('name') && $request->name !== $group->name) {
            $existingGroup = Group::where('department_id', $group->department_id)
                ->where('name', $request->name)
                ->where('id', '!=', $id)
                ->first();
            
            if ($existingGroup) {
                return response()->json([
                    'message' => 'A group with this name already exists in this department'
                ], 422);
            }
        }

        // Verify all leader_ids are in member_ids if both are provided
        if ($request->has('member_ids') && $request->has('leader_ids')) {
            $invalidLeaders = array_diff($request->leader_ids ?? [], $request->member_ids);
            if (!empty($invalidLeaders)) {
                return response()->json([
                    'message' => 'All leaders must be members of the group'
                ], 422);
            }
        }

        // Update basic info
        $group->update($request->only(['name', 'description', 'is_active']));

        // Update members if provided
        if ($request->has('member_ids')) {
            $memberData = [];
            foreach ($request->member_ids as $memberId) {
                $role = in_array($memberId, $request->leader_ids ?? []) ? 'leader' : 'member';
                $memberData[$memberId] = ['role' => $role];
            }
            $group->members()->sync($memberData);
        }

        return response()->json([
            'message' => 'Group updated successfully',
            'data' => $group->load(['members', 'department']),
        ]);
    }

    /**
     * Delete a group
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $group = Group::find($id);

        if (!$group) {
            return response()->json(['message' => 'Group not found'], 404);
        }

        // Only regular employees cannot delete groups
        if ($user->isEmployee() && !$user->isSeniorEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Admin, HOD, and Senior Employees can delete groups in ANY department

        $group->delete();

        return response()->json([
            'message' => 'Group deleted successfully'
        ]);
    }
}
