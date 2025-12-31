<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\GroupPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class GroupPlanController extends Controller
{
    /**
     * Get all plans for a specific group.
     */
    public function index(Request $request, Group $group)
    {
        $user = Auth::user();

        // Check if user has access to this group
        if (!$this->canAccessGroup($user, $group)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $query = $group->plans()->with(['creator:id,name,email']);

        // For regular employees, only show published plans
        if ($user->role === 'employee') {
            $query->published();
        }

        $plans = $query->orderBy('created_at', 'desc')->get();

        return response()->json($plans);
    }

    /**
     * Get all plans accessible by the current user across all their groups.
     */
    public function myPlans(Request $request)
    {
        $user = Auth::user();

        $query = GroupPlan::with(['group:id,name,department_id', 'creator:id,name,email']);

        if ($user->role === 'super_admin') {
            // Super admin can see all plans
        } elseif ($user->role === 'dept_admin') {
            // Dept admin can see plans from groups they created or belong to
            $groupIds = Group::where('created_by', $user->id)
                ->orWhereHas('members', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                })
                ->pluck('id');
            $query->whereIn('group_id', $groupIds);
        } else {
            // Employees can only see published plans from groups they belong to
            $groupIds = $user->groups()->pluck('groups.id');
            $query->whereIn('group_id', $groupIds)->published();
        }

        $plans = $query->orderBy('created_at', 'desc')->get();

        return response()->json($plans);
    }

    /**
     * Create a new plan for a group.
     */
    public function store(Request $request, Group $group)
    {
        $user = Auth::user();

        // Only group creator (dept admin) or super admin can create plans
        if (!$this->canManageGroupPlans($user, $group)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'content' => 'required|string',
            'status' => ['nullable', Rule::in(['draft', 'published', 'archived'])],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high'])],
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $plan = $group->plans()->create([
            ...$validated,
            'created_by' => $user->id,
            'status' => $validated['status'] ?? 'draft',
            'priority' => $validated['priority'] ?? 'medium',
        ]);

        return response()->json([
            'message' => 'Plan created successfully',
            'plan' => $plan->load(['creator:id,name,email', 'group:id,name']),
        ], 201);
    }

    /**
     * Get a specific plan.
     */
    public function show(Group $group, GroupPlan $plan)
    {
        $user = Auth::user();

        // Ensure plan belongs to group
        if ($plan->group_id !== $group->id) {
            return response()->json(['error' => 'Plan not found'], 404);
        }

        // Check access
        if (!$this->canAccessGroup($user, $group)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // For employees, only show published plans
        if ($user->role === 'employee' && $plan->status !== 'published') {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json($plan->load(['creator:id,name,email', 'group:id,name']));
    }

    /**
     * Update a plan.
     */
    public function update(Request $request, Group $group, GroupPlan $plan)
    {
        $user = Auth::user();

        // Ensure plan belongs to group
        if ($plan->group_id !== $group->id) {
            return response()->json(['error' => 'Plan not found'], 404);
        }

        // Only group creator (dept admin) or super admin can update plans
        if (!$this->canManageGroupPlans($user, $group)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'content' => 'sometimes|required|string',
            'status' => ['nullable', Rule::in(['draft', 'published', 'archived'])],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high'])],
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $plan->update($validated);

        return response()->json([
            'message' => 'Plan updated successfully',
            'plan' => $plan->fresh()->load(['creator:id,name,email', 'group:id,name']),
        ]);
    }

    /**
     * Delete a plan.
     */
    public function destroy(Group $group, GroupPlan $plan)
    {
        $user = Auth::user();

        // Ensure plan belongs to group
        if ($plan->group_id !== $group->id) {
            return response()->json(['error' => 'Plan not found'], 404);
        }

        // Only group creator (dept admin) or super admin can delete plans
        if (!$this->canManageGroupPlans($user, $group)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $plan->delete();

        return response()->json(['message' => 'Plan deleted successfully']);
    }

    /**
     * Check if user can access a group.
     */
    private function canAccessGroup($user, Group $group): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        if ($user->role === 'dept_admin') {
            // Dept admin can access groups they created or belong to
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

    /**
     * Check if user can manage plans in a group.
     */
    private function canManageGroupPlans($user, Group $group): bool
    {
        if ($user->role === 'super_admin') {
            return true;
        }

        if ($user->role === 'dept_admin') {
            // Dept admin can manage plans in groups they created
            if ($group->created_by === $user->id) {
                return true;
            }
            // Or groups in their managed departments
            $managedDeptIds = $user->managed_department_ids ?? [];
            if (in_array($group->department_id, $managedDeptIds)) {
                return true;
            }
        }

        return false;
    }
}
