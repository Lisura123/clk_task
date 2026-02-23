<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScheduledPlan;
use App\Models\Department;
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
        $query = ScheduledPlan::with(['creator', 'department', 'group']);

        // Filter by user's access
        if ($user->role === 'admin') {
            // Super admin sees all
        } elseif ($user->role === 'hod') {
            $managedDeptIds = $this->getManagedDepartmentIds($user);
            $query->whereIn('department_id', $managedDeptIds);
        } else {
            // Regular employees see plans from their department or groups they belong to
            $userGroupIds = $user->groups()->pluck('groups.id')->toArray();
            $userDepartmentId = $user->department_id;

            if ($userDepartmentId || !empty($userGroupIds)) {
                $query->where(function ($q) use ($userDepartmentId, $userGroupIds) {
                    if ($userDepartmentId) {
                        $q->where('department_id', $userDepartmentId);
                    }
                    if (!empty($userGroupIds)) {
                        $q->orWhereIn('group_id', $userGroupIds);
                    }
                });
            } else {
                // If user has no department or groups, show nothing
                $query->whereRaw('1 = 0');
            }
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->where(function($q) use ($request) {
                $q->whereBetween('start_date', [$request->start_date, $request->end_date])
                  ->orWhereBetween('end_date', [$request->start_date, $request->end_date])
                  ->orWhere(function($inner) use ($request) {
                      $inner->where('start_date', '<=', $request->start_date)
                            ->where('end_date', '>=', $request->end_date);
                  });
            });
        }

        // Filter by department
        if ($request->has('department_id') && $request->department_id !== 'all') {
            $query->where('department_id', $request->department_id);
        }

        $plans = $query->orderBy('start_date')->get()->map(function ($plan) {
            // Get employees for this plan (from group if set, otherwise from department)
            $employees = [];
            if ($plan->group_id && $plan->group) {
                $employees = $plan->group->members->map(function ($member) {
                    return [
                        'id' => $member->id,
                        'name' => $member->name,
                        'email' => $member->email,
                        'role' => $member->pivot->role ?? 'member',
                        'profile_picture' => $member->profile_picture,
                    ];
                })->toArray();
            } elseif ($plan->department_id && $plan->department) {
                $employees = $plan->department->users()
                    ->whereIn('role', ['employee', 'senior_employee', 'hod'])
                    ->where('status', 'active')
                    ->get()
                    ->map(function ($user) {
                        return [
                            'id' => $user->id,
                            'name' => $user->name,
                            'email' => $user->email,
                            'role' => $user->role,
                            'profile_picture' => $user->profile_picture,
                        ];
                    })->toArray();
            }

            return [
                'id' => $plan->id,
                'title' => $plan->title,
                'description' => $plan->description,
                'department_id' => $plan->department_id,
                'department_name' => $plan->department->name ?? 'Unknown',
                'group_id' => $plan->group_id,
                'group_name' => $plan->group->name ?? null,
                'created_by' => $plan->created_by,
                'creator_name' => $plan->creator->name ?? 'Unknown',
                'start_date' => $plan->start_date->format('Y-m-d'),
                'end_date' => $plan->end_date?->format('Y-m-d'),
                'is_recurring' => $plan->is_recurring,
                'recurrence_pattern' => $plan->recurrence_pattern,
                'recurrence_end_date' => $plan->recurrence_end_date?->format('Y-m-d'),
                'notes' => $plan->notes,
                'employees' => $employees,
                'employee_count' => count($employees),
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
        if (!in_array($user->role, ['admin', 'hod'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'required|exists:departments,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_recurring' => 'nullable|boolean',
            'recurrence_pattern' => 'nullable|in:daily,weekly,monthly,yearly',
            'recurrence_end_date' => 'nullable|date|after:start_date',
            'notes' => 'nullable|string',
        ]);

        // Verify dept admin can create for this department
        if ($user->role === 'hod') {
            $managedDeptIds = $this->getManagedDepartmentIds($user);
            if (!in_array((int)$validated['department_id'], $managedDeptIds)) {
                return response()->json(['message' => 'You can only create plans for your managed departments'], 403);
            }
        }

        $validated['created_by'] = $user->id;

        $plan = ScheduledPlan::create($validated);

        return response()->json([
            'message' => 'Scheduled plan created successfully',
            'plan' => $plan->load(['creator', 'department']),
        ], 201);
    }

    /**
     * Get a specific scheduled plan
     */
    public function show($id)
    {
        $user = Auth::user();
        $plan = ScheduledPlan::with(['creator', 'department', 'group'])->findOrFail($id);

        // Check access
        if ($user->role !== 'admin') {
            $managedDeptIds = $this->getManagedDepartmentIds($user);
            if (!in_array($plan->department_id, $managedDeptIds)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        // Get employees for this plan
        $employees = [];
        if ($plan->group_id && $plan->group) {
            $employees = $plan->group->members->map(function ($member) {
                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'role' => $member->pivot->role ?? 'member',
                    'profile_picture' => $member->profile_picture,
                ];
            })->toArray();
        } elseif ($plan->department_id && $plan->department) {
            $employees = $plan->department->users()
                ->whereIn('role', ['employee', 'senior_employee', 'hod'])
                ->where('status', 'active')
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role,
                        'profile_picture' => $user->profile_picture,
                    ];
                })->toArray();
        }

        return response()->json([
            'id' => $plan->id,
            'title' => $plan->title,
            'description' => $plan->description,
            'department_id' => $plan->department_id,
            'department_name' => $plan->department->name ?? 'Unknown',
            'group_id' => $plan->group_id,
            'group_name' => $plan->group->name ?? null,
            'created_by' => $plan->created_by,
            'creator_name' => $plan->creator->name ?? 'Unknown',
            'start_date' => $plan->start_date->format('Y-m-d'),
            'end_date' => $plan->end_date?->format('Y-m-d'),
            'is_recurring' => $plan->is_recurring,
            'recurrence_pattern' => $plan->recurrence_pattern,
            'recurrence_end_date' => $plan->recurrence_end_date?->format('Y-m-d'),
            'notes' => $plan->notes,
            'employees' => $employees,
            'employee_count' => count($employees),
            'created_at' => $plan->created_at,
            'updated_at' => $plan->updated_at,
        ]);
    }

    /**
     * Update a scheduled plan
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $plan = ScheduledPlan::findOrFail($id);

        // Check permission
        if (!in_array($user->role, ['admin', 'hod'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check department access
        if ($user->role === 'hod') {
            $managedDeptIds = $this->getManagedDepartmentIds($user);
            if (!in_array($plan->department_id, $managedDeptIds)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_recurring' => 'nullable|boolean',
            'recurrence_pattern' => 'nullable|in:daily,weekly,monthly,yearly',
            'recurrence_end_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $plan->update($validated);

        return response()->json([
            'message' => 'Scheduled plan updated successfully',
            'plan' => $plan->load(['creator', 'department']),
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
        if (!in_array($user->role, ['admin', 'hod'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Check department access
        if ($user->role === 'hod') {
            $managedDeptIds = $this->getManagedDepartmentIds($user);
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
        $month = str_pad($request->get('month', date('m')), 2, '0', STR_PAD_LEFT);

        $startDate = "{$year}-{$month}-01";
        $endDate = date('Y-m-t', strtotime($startDate));

        $query = ScheduledPlan::with(['creator', 'department', 'group'])
            ->where(function($q) use ($startDate, $endDate) {
                // Plan starts within the month
                $q->whereBetween('start_date', [$startDate, $endDate])
                  // OR plan ends within the month
                  ->orWhereBetween('end_date', [$startDate, $endDate])
                  // OR plan spans the entire month
                  ->orWhere(function($inner) use ($startDate, $endDate) {
                      $inner->where('start_date', '<=', $startDate)
                            ->where('end_date', '>=', $endDate);
                  })
                  // Include plans without end_date (single day plans)
                  ->orWhere(function($inner) use ($startDate, $endDate) {
                      $inner->whereNull('end_date')
                            ->whereBetween('start_date', [$startDate, $endDate]);
                  });
            });

        // Filter by user's access
        if ($user->role === 'admin') {
            // Super admin sees all
        } elseif ($user->role === 'hod') {
            $managedDeptIds = $this->getManagedDepartmentIds($user);
            $query->whereIn('department_id', $managedDeptIds);
        } else {
            // Regular employees see plans from their department or groups they belong to
            $userGroupIds = $user->groups()->pluck('groups.id')->toArray();
            $userDepartmentId = $user->department_id;

            if ($userDepartmentId || !empty($userGroupIds)) {
                $query->where(function ($q) use ($userDepartmentId, $userGroupIds) {
                    if ($userDepartmentId) {
                        $q->where('department_id', $userDepartmentId);
                    }
                    if (!empty($userGroupIds)) {
                        $q->orWhereIn('group_id', $userGroupIds);
                    }
                });
            } else {
                // If user has no department or groups, show nothing
                $query->whereRaw('1 = 0');
            }
        }

        // Filter by department if specified
        if ($request->has('department_id') && $request->department_id !== 'all') {
            $query->where('department_id', $request->department_id);
        }

        $plans = $query->orderBy('start_date')->get();

        // Group plans by date for calendar view
        $calendarData = [];
        foreach ($plans as $plan) {
            $planStart = $plan->start_date;
            $planEnd = $plan->end_date ?? $plan->start_date;
            
            // Get employees for this plan
            $employees = [];
            if ($plan->group_id && $plan->group) {
                $employees = $plan->group->members->map(function ($member) {
                    return [
                        'id' => $member->id,
                        'name' => $member->name,
                        'profile_picture' => $member->profile_picture,
                    ];
                })->toArray();
            } elseif ($plan->department_id && $plan->department) {
                $employees = $plan->department->users()
                    ->whereIn('role', ['employee', 'senior_employee', 'hod'])
                    ->where('status', 'active')
                    ->get()
                    ->map(function ($user) {
                        return [
                            'id' => $user->id,
                            'name' => $user->name,
                            'profile_picture' => $user->profile_picture,
                        ];
                    })->toArray();
            }
            
            // Add plan to each day it spans
            $currentDate = clone $planStart;
            while ($currentDate <= $planEnd) {
                $dateKey = $currentDate->format('Y-m-d');
                
                // Only include dates within the requested month
                if ($dateKey >= $startDate && $dateKey <= $endDate) {
                    if (!isset($calendarData[$dateKey])) {
                        $calendarData[$dateKey] = [];
                    }
                    
                    // Avoid duplicates
                    $exists = collect($calendarData[$dateKey])->contains('id', $plan->id);
                    if (!$exists) {
                        $calendarData[$dateKey][] = [
                            'id' => $plan->id,
                            'title' => $plan->title,
                            'description' => $plan->description,
                            'department_id' => $plan->department_id,
                            'department_name' => $plan->department->name ?? 'Unknown',
                            'group_id' => $plan->group_id,
                            'group_name' => $plan->group->name ?? null,
                            'start_date' => $plan->start_date->format('Y-m-d'),
                            'end_date' => $plan->end_date?->format('Y-m-d'),
                            'is_recurring' => $plan->is_recurring,
                            'recurrence_pattern' => $plan->recurrence_pattern,
                            'creator_name' => $plan->creator->name ?? 'Unknown',
                            'employees' => $employees,
                            'employee_count' => count($employees),
                        ];
                    }
                }
                
                $currentDate->addDay();
            }
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

        $query = ScheduledPlan::with(['creator', 'department'])
            ->where(function($q) {
                $q->where('start_date', '>=', now()->toDateString())
                  ->orWhere(function($inner) {
                      $inner->where('end_date', '>=', now()->toDateString());
                  });
            });

        // Filter by user's access
        if ($user->role === 'admin') {
            // Super admin sees all
        } elseif ($user->role === 'hod') {
            $managedDeptIds = $this->getManagedDepartmentIds($user);
            $query->whereIn('department_id', $managedDeptIds);
        } else {
            $query->where('department_id', $user->department_id);
        }

        $plans = $query->orderBy('start_date')->limit($limit)->get();

        return response()->json($plans);
    }

    /**
     * Get managed department IDs for a user
     */
    private function getManagedDepartmentIds($user): array
    {
        $managedDeptIds = collect($user->managed_department_ids ?? [])
            ->map(fn($id) => is_numeric($id) ? (int)$id : null)
            ->filter()
            ->toArray();
        
        if (empty($managedDeptIds) && $user->department_id) {
            $managedDeptIds = [$user->department_id];
        }
        
        return $managedDeptIds;
    }
}
