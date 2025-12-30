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

        // Filter by department for dept admins
        if ($user->isDeptAdmin()) {
            $managedDepts = $user->managed_department_ids ?? [];
            $query->whereIn('department_id', $managedDepts);
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

        if ($user->isEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'required|exists:departments,id',
            'member_ids' => 'required|array|min:1',
            'member_ids.*' => 'exists:users,id',
            'leader_ids' => 'nullable|array',
            'leader_ids.*' => 'exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if dept admin can create group in this department
        if ($user->isDeptAdmin() && !$user->managesDepartment($request->department_id)) {
            return response()->json(['message' => 'You cannot create groups in this department'], 403);
        }

        // Verify all members belong to the department
        $members = User::whereIn('id', $request->member_ids)->get();
        $invalidMembers = $members->filter(function ($member) use ($request) {
            return $member->department_id != $request->department_id;
        });

        if ($invalidMembers->count() > 0) {
            return response()->json([
                'message' => 'All members must belong to the selected department'
            ], 422);
        }

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

        // Check access
        if ($user->isDeptAdmin() && !$user->managesDepartment($group->department_id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
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

        if ($user->isEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check if dept admin can update this group
        if ($user->isDeptAdmin() && !$user->managesDepartment($group->department_id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'member_ids' => 'sometimes|array|min:1',
            'member_ids.*' => 'exists:users,id',
            'leader_ids' => 'nullable|array',
            'leader_ids.*' => 'exists:users,id',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
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

        if ($user->isEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check if dept admin can delete this group
        if ($user->isDeptAdmin() && !$user->managesDepartment($group->department_id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $group->delete();

        return response()->json([
            'message' => 'Group deleted successfully'
        ]);
    }
}
