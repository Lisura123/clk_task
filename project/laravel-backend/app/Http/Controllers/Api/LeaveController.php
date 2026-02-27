<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveType;
use App\Models\LeaveRequest;
use App\Models\LeaveBalance;
use App\Models\Holiday;
use App\Models\Notification;
use App\Models\Department;
use App\Models\User;
use App\Notifications\LeaveRequestSubmittedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class LeaveController extends Controller
{
    /**
     * Get all leave types
     */
    public function getLeaveTypes(Request $request)
    {
        $query = LeaveType::query();
        
        if (!$request->boolean('include_inactive')) {
            $query->active();
        }
        
        $leaveTypes = $query->orderBy('name')->get();
        
        return response()->json([
            'success' => true,
            'data' => $leaveTypes
        ]);
    }

    /**
     * Create a new leave type (Super Admin only)
     */
    public function createLeaveType(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:leave_types,code',
            'description' => 'nullable|string',
            'default_days_per_year' => 'required|integer|min:0',
            'is_paid' => 'boolean',
            'requires_attachment' => 'boolean',
            'max_consecutive_days' => 'nullable|integer|min:1',
            'min_notice_days' => 'integer|min:0',
            'color' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $leaveType = LeaveType::create($request->only([
            'name', 'code', 'description', 'default_days_per_year', 
            'is_paid', 'requires_attachment', 'max_consecutive_days', 
            'min_notice_days', 'color'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Leave type created successfully',
            'data' => $leaveType
        ], 201);
    }

    /**
     * Update leave type (Super Admin only)
     */
    public function updateLeaveType(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $leaveType = LeaveType::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:100',
            'code' => 'string|max:20|unique:leave_types,code,' . $id,
            'description' => 'nullable|string',
            'default_days_per_year' => 'integer|min:0',
            'is_paid' => 'boolean',
            'requires_attachment' => 'boolean',
            'max_consecutive_days' => 'nullable|integer|min:1',
            'min_notice_days' => 'integer|min:0',
            'is_active' => 'boolean',
            'color' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $leaveType->update($request->only([
            'name', 'code', 'description', 'default_days_per_year',
            'is_paid', 'requires_attachment', 'max_consecutive_days',
            'min_notice_days', 'is_active', 'color'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Leave type updated successfully',
            'data' => $leaveType
        ]);
    }

    /**
     * Delete leave type (Super Admin only)
     */
    public function deleteLeaveType(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $leaveType = LeaveType::findOrFail($id);
        
        // Check if there are any leave requests using this type
        if ($leaveType->leaveRequests()->exists()) {
            return response()->json([
                'message' => 'Cannot delete leave type with existing requests. Deactivate it instead.'
            ], 400);
        }

        $leaveType->delete();

        return response()->json([
            'success' => true,
            'message' => 'Leave type deleted successfully'
        ]);
    }

    /**
     * Get all employees' leave balances and no-pay details (Admin/HR only)
     * Supports monthly and yearly filtering
     */
    public function getAllBalances(Request $request)
    {
        $user = $request->user();
        
        // Only Admin and HR can view all balances
        if (!$user->isAdmin() && !$user->isHR()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $year = $request->get('year', date('Y'));
        $month = $request->get('month'); // Optional month filter (1-12)
        $departmentId = $request->get('department_id');
        $search = $request->get('search');
        
        // Custom date range parameters
        $customStartDate = $request->get('start_date');
        $customEndDate = $request->get('end_date');

        // Build query for users with their leave balances
        $query = User::with(['departmentRelation', 'leaveBalances' => function ($q) use ($year, $customStartDate) {
            // Use year from custom start date if provided
            $balanceYear = $customStartDate ? Carbon::parse($customStartDate)->year : $year;
            $q->where('year', $balanceYear)->with('leaveType');
        }])
        ->whereIn('status', ['active', 'approved'])
        ->whereIn('role', ['employee', 'senior_employee', 'hod']);

        // Filter by department
        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }

        // Search by name or emp_code
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('emp_code', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('name')->paginate($request->get('per_page', 20));

        // Get unpaid leave requests (no-pay) for each user
        $userIds = $users->pluck('id')->toArray();
        
        // Build date range - use custom dates if provided, otherwise use month/year
        if ($customStartDate && $customEndDate) {
            $startDate = Carbon::parse($customStartDate)->startOfDay();
            $endDate = Carbon::parse($customEndDate)->endOfDay();
        } elseif ($month) {
            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = Carbon::create($year, $month, 1)->endOfMonth();
        } else {
            $startDate = Carbon::create($year, 1, 1)->startOfYear();
            $endDate = Carbon::create($year, 12, 31)->endOfYear();
        }

        // Get approved unpaid leaves (no-pay)
        $unpaidLeaves = LeaveRequest::whereIn('user_id', $userIds)
            ->where('status', 'approved')
            ->whereHas('leaveType', function ($q) {
                $q->where('is_paid', false);
            })
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('start_date', [$startDate, $endDate])
                  ->orWhereBetween('end_date', [$startDate, $endDate])
                  ->orWhere(function ($q2) use ($startDate, $endDate) {
                      $q2->where('start_date', '<=', $startDate)
                         ->where('end_date', '>=', $endDate);
                  });
            })
            ->with('leaveType')
            ->get()
            ->groupBy('user_id');

        // Get all approved leaves for the period
        $allLeaves = LeaveRequest::whereIn('user_id', $userIds)
            ->where('status', 'approved')
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('start_date', [$startDate, $endDate])
                  ->orWhereBetween('end_date', [$startDate, $endDate])
                  ->orWhere(function ($q2) use ($startDate, $endDate) {
                      $q2->where('start_date', '<=', $startDate)
                         ->where('end_date', '>=', $endDate);
                  });
            })
            ->with('leaveType')
            ->get()
            ->groupBy('user_id');

        // Format the response
        $data = $users->map(function ($u) use ($unpaidLeaves, $allLeaves, $month, $year) {
            $userUnpaidLeaves = $unpaidLeaves->get($u->id, collect());
            $userAllLeaves = $allLeaves->get($u->id, collect());
            
            // Calculate total no-pay days
            $totalNoPay = $userUnpaidLeaves->sum('total_days');
            
            // Calculate total leave days taken
            $totalLeaveDays = $userAllLeaves->sum('total_days');
            $paidLeaveDays = $userAllLeaves->filter(function ($leave) {
                return $leave->leaveType && $leave->leaveType->is_paid;
            })->sum('total_days');

            return [
                'user_id' => $u->id,
                'emp_code' => $u->emp_code,
                'name' => $u->name,
                'email' => $u->email,
                'department' => $u->departmentRelation?->name ?? $u->department,
                'department_id' => $u->department_id,
                'role' => $u->role,
                'profile_image' => $u->profile_picture ? asset('storage/' . $u->profile_picture) : null,
                'leave_balances' => $u->leaveBalances->map(function ($balance) {
                    return [
                        'id' => $balance->id,
                        'leave_type_id' => $balance->leave_type_id,
                        'leave_type' => $balance->leaveType?->name,
                        'leave_type_name' => $balance->leaveType?->name,
                        'is_paid' => $balance->leaveType?->is_paid ?? true,
                        'entitled_days' => (float) ($balance->allocated_days + $balance->carried_over),
                        'allocated_days' => (float) $balance->allocated_days,
                        'used_days' => (float) $balance->used_days,
                        'pending_days' => (float) $balance->pending_days,
                        'remaining_days' => (float) $balance->available_days,
                        'available_days' => (float) $balance->available_days,
                        'carried_over' => (float) $balance->carried_over,
                    ];
                }),
                'total_no_pay_days' => (float) $totalNoPay,
                'total_leave_days' => (float) $totalLeaveDays,
                'paid_leave_days' => (float) $paidLeaveDays,
                'summary' => [
                    'total_leave_days' => (float) $totalLeaveDays,
                    'paid_leave_days' => (float) $paidLeaveDays,
                    'no_pay_days' => (float) $totalNoPay,
                    'period' => $month ? date('F Y', mktime(0, 0, 0, $month, 1, $year)) : $year,
                ],
                'no_pay_leaves' => $userUnpaidLeaves->map(function ($leave) {
                    return [
                        'id' => $leave->id,
                        'leave_type' => $leave->leaveType?->name,
                        'start_date' => $leave->start_date->format('Y-m-d'),
                        'end_date' => $leave->end_date->format('Y-m-d'),
                        'total_days' => (float) $leave->total_days,
                        'reason' => $leave->reason,
                    ];
                }),
            ];
        });

        // Calculate totals for summary
        $totalLeaveUsed = $data->sum('total_leave_days');
        $totalNoPay = $data->sum('total_no_pay_days');

        // Get departments for filter dropdown
        $departments = \App\Models\Department::select('id', 'name')->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $data,
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
            'filters' => [
                'year' => (int) $year,
                'month' => $month ? (int) $month : null,
                'department_id' => $departmentId ? (int) $departmentId : null,
            ],
            'departments' => $departments,
            'summary' => [
                'total_employees' => $users->total(),
                'total_leave_days_used' => (float) $totalLeaveUsed,
                'total_no_pay_days' => (float) $totalNoPay,
                'period' => $month ? date('F Y', mktime(0, 0, 0, $month, 1, $year)) : "Year $year",
            ],
        ]);
    }

    /**
     * Get leave balances for current user
     */
    public function getMyBalances(Request $request)
    {
        $user = $request->user();
        $year = $request->get('year', date('Y'));

        $balances = LeaveBalance::getBalancesForUser($user->id, $year);

        return response()->json([
            'success' => true,
            'data' => $balances->map(function ($balance) {
                return [
                    'id' => $balance->id,
                    'leave_type' => $balance->leaveType,
                    'year' => $balance->year,
                    'allocated_days' => (float) $balance->allocated_days,
                    'used_days' => (float) $balance->used_days,
                    'pending_days' => (float) $balance->pending_days,
                    'carried_over' => (float) $balance->carried_over,
                    'available_days' => (float) $balance->available_days,
                    'total_entitlement' => (float) $balance->total_entitlement,
                ];
            })
        ]);
    }

    /**
     * Get leave balances for a specific user (Admin/HOD/Senior Employee/Procurement)
     */
    public function getUserBalances(Request $request, $userId)
    {
        $user = $request->user();
        $targetUser = User::find($userId);
        
        if (!$targetUser) {
            return response()->json(['message' => 'User not found'], 404);
        }
        
        // Check if user can view this employee's details
        if (!$user->canViewEmployeeDetails($targetUser)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $year = $request->get('year', date('Y'));
        $balances = LeaveBalance::getBalancesForUser($userId, $year);

        return response()->json([
            'success' => true,
            'data' => $balances->map(function ($balance) {
                return [
                    'id' => $balance->id,
                    'leave_type' => $balance->leaveType,
                    'year' => $balance->year,
                    'allocated_days' => (float) $balance->allocated_days,
                    'used_days' => (float) $balance->used_days,
                    'pending_days' => (float) $balance->pending_days,
                    'carried_over' => (float) $balance->carried_over,
                    'available_days' => (float) $balance->available_days,
                    'total_entitlement' => (float) $balance->total_entitlement,
                ];
            })
        ]);
    }

    /**
     * Update leave balance (Admin only)
     */
    public function updateBalance(Request $request, $balanceId)
    {
        $user = $request->user();
        
        if (!$user->isAdmin() && !$user->isHod()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $balance = LeaveBalance::findOrFail($balanceId);

        $validator = Validator::make($request->all(), [
            'allocated_days' => 'numeric|min:0',
            'carried_over' => 'numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $balance->update($request->only(['allocated_days', 'carried_over']));

        return response()->json([
            'success' => true,
            'message' => 'Leave balance updated successfully',
            'data' => $balance
        ]);
    }

    /**
     * Get my leave requests
     */
    public function getMyLeaves(Request $request)
    {
        $user = $request->user();
        $year = $request->get('year', date('Y'));
        $status = $request->get('status');

        $query = LeaveRequest::forUser($user->id)
            ->forYear($year)
            ->with(['leaveType', 'approvedBy', 'hodApprovedBy', 'adminApprovedBy'])
            ->orderBy('created_at', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        $leaves = $query->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $leaves->items(),
            'pagination' => [
                'current_page' => $leaves->currentPage(),
                'last_page' => $leaves->lastPage(),
                'per_page' => $leaves->perPage(),
                'total' => $leaves->total(),
            ]
        ]);
    }

    /**
     * Get leave requests for a specific user (Admin/HOD/Senior Employee/Procurement)
     */
    public function getUserLeaves(Request $request, $userId)
    {
        $user = $request->user();
        $targetUser = User::find($userId);
        
        if (!$targetUser) {
            return response()->json(['message' => 'User not found'], 404);
        }
        
        // Check if user can view this employee's details
        if (!$user->canViewEmployeeDetails($targetUser)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $year = $request->get('year', date('Y'));
        $status = $request->get('status');

        $query = LeaveRequest::forUser($userId)
            ->forYear($year)
            ->with(['leaveType', 'approvedBy', 'hodApprovedBy', 'adminApprovedBy'])
            ->orderBy('created_at', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        $leaves = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $leaves->items(),
            'pagination' => [
                'current_page' => $leaves->currentPage(),
                'last_page' => $leaves->lastPage(),
                'per_page' => $leaves->perPage(),
                'total' => $leaves->total(),
            ]
        ]);
    }

    /**
     * Get all leave requests (Admin, HOD, or HR for approved leaves)
     */
    public function getAllLeaves(Request $request)
    {
        $user = $request->user();
        
        // HR can only view approved leaves
        if ($user->isHR() && !$user->isAdmin() && !$user->isHod()) {
            return $this->getApprovedLeavesForHR($request);
        }
        
        if (!$user->isAdmin() && !$user->isHod()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = LeaveRequest::with(['user', 'leaveType', 'department', 'approvedBy', 'hodApprovedBy', 'adminApprovedBy']);

        // Filter by department for dept admin
        if ($user->isHod()) {
            $managedDepts = $user->managed_department_ids ?? [];
            if (empty($managedDepts) && $user->department_id) {
                $managedDepts = [$user->department_id];
            }
            $query->whereIn('department_id', $managedDepts);
        }

        // Filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('leave_type_id')) {
            $query->where('leave_type_id', $request->leave_type_id);
        }

        if ($request->has('year')) {
            $query->forYear($request->year);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->where('start_date', '>=', $request->start_date)
                  ->where('end_date', '<=', $request->end_date);
        }

        $leaves = $query->orderBy('created_at', 'desc')
                       ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $leaves->items(),
            'pagination' => [
                'current_page' => $leaves->currentPage(),
                'last_page' => $leaves->lastPage(),
                'per_page' => $leaves->perPage(),
                'total' => $leaves->total(),
            ]
        ]);
    }

    /**
     * Get approved leave requests for HR department
     * HR can view all approved and hod_approved leaves for tracking purposes
     */
    protected function getApprovedLeavesForHR(Request $request)
    {
        $query = LeaveRequest::with(['user', 'leaveType', 'department', 'approvedBy', 'hodApprovedBy', 'adminApprovedBy'])
            ->whereIn('status', ['approved', 'hod_approved']);

        // Filters
        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('leave_type_id')) {
            $query->where('leave_type_id', $request->leave_type_id);
        }

        if ($request->has('year')) {
            $query->forYear($request->year);
        } else {
            // Default to current year
            $query->forYear(now()->year);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->where('start_date', '>=', $request->start_date)
                  ->where('end_date', '<=', $request->end_date);
        }

        // Filter by status if provided (approved or hod_approved)
        if ($request->has('status') && in_array($request->status, ['approved', 'hod_approved'])) {
            $query->where('status', $request->status);
        }

        $leaves = $query->orderBy('created_at', 'desc')
                       ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $leaves->items(),
            'pagination' => [
                'current_page' => $leaves->currentPage(),
                'last_page' => $leaves->lastPage(),
                'per_page' => $leaves->perPage(),
                'total' => $leaves->total(),
            ],
            'is_hr_view' => true,
            'message' => 'Showing approved leave requests'
        ]);
    }

    /**
     * Get approved leave requests (HR, Admin, HOD)
     * HR sees all approved leaves across all departments
     * Admin/HOD can also use this endpoint
     */
    public function getApprovedLeaves(Request $request)
    {
        $user = $request->user();
        
        // HR, Admin, and HOD can view approved leaves
        if (!$user->isHR() && !$user->isAdmin() && !$user->isHod()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = LeaveRequest::with(['user', 'leaveType', 'department', 'approvedBy', 'hodApprovedBy', 'adminApprovedBy'])
            ->whereIn('status', ['approved', 'hod_approved']);

        // HOD can only see their department's approved leaves
        if ($user->isHod() && !$user->isAdmin() && !$user->isHR()) {
            $managedDepts = $user->managed_department_ids ?? [];
            if (empty($managedDepts) && $user->department_id) {
                $managedDepts = [$user->department_id];
            }
            $query->whereIn('department_id', $managedDepts);
        }

        // Filters
        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('leave_type_id')) {
            $query->where('leave_type_id', $request->leave_type_id);
        }

        if ($request->has('year')) {
            $query->forYear($request->year);
        } else {
            // Default to current year
            $query->forYear(now()->year);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->where('start_date', '>=', $request->start_date)
                  ->where('end_date', '<=', $request->end_date);
        }

        // Filter by specific status if provided
        if ($request->has('status') && in_array($request->status, ['approved', 'hod_approved'])) {
            $query->where('status', $request->status);
        }

        $leaves = $query->orderBy('created_at', 'desc')
                       ->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $leaves->items(),
            'pagination' => [
                'current_page' => $leaves->currentPage(),
                'last_page' => $leaves->lastPage(),
                'per_page' => $leaves->perPage(),
                'total' => $leaves->total(),
            ]
        ]);
    }

    /**
     * Get pending leave requests (Admin only)
     * HOD sees: pending requests from employees in their department (except HR)
     * Admin sees: hod_approved requests (needing final approval) + pending HOD requests + pending HR requests
     */
    public function getPendingLeaves(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isAdmin() && !$user->isHod()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = LeaveRequest::with(['user', 'leaveType', 'department', 'hodApprovedBy', 'adminApprovedBy']);

        // Get HR department ID
        $hrDeptId = \App\Models\Department::where('name', 'HR')->value('id');

        if ($user->isAdmin()) {
            // Admin sees:
            // 1. Requests from HODs that are pending (direct admin approval)
            // 2. Requests from employees/senior employees that have been approved by HOD (hod_approved)
            // 3. Requests from HR department employees (pending - they skip HOD approval)
            $query->where(function ($q) use ($hrDeptId) {
                // HOD requests pending admin approval
                $q->where('status', 'pending')
                  ->whereHas('user', function ($uq) {
                      $uq->where('role', 'hod');
                  });
            })->orWhere(function ($q) {
                // Employee/Senior Employee requests that HOD approved, pending admin final approval
                $q->where('status', 'hod_approved');
            })->orWhere(function ($q) use ($hrDeptId) {
                // HR department employees - pending requests go directly to admin
                if ($hrDeptId) {
                    $q->where('status', 'pending')
                      ->where('department_id', $hrDeptId)
                      ->whereHas('user', function ($uq) {
                          $uq->whereIn('role', ['employee', 'senior_employee']);
                      });
                }
            });
        } else {
            // HOD sees pending requests from employees and senior employees in their department
            // EXCEPT HR department (they go directly to admin)
            $managedDepts = $user->managed_department_ids ?? [];
            if (empty($managedDepts) && $user->department_id) {
                $managedDepts = [$user->department_id];
            }
            
            // Exclude HR department from HOD's view
            if ($hrDeptId) {
                $managedDepts = array_filter($managedDepts, fn($id) => (int)$id !== (int)$hrDeptId);
            }
            
            $query->where('status', 'pending')
                  ->whereIn('department_id', $managedDepts)
                  ->whereHas('user', function ($uq) {
                      $uq->whereIn('role', ['employee', 'senior_employee']);
                  });
        }

        $leaves = $query->orderBy('created_at', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $leaves,
            'count' => $leaves->count()
        ]);
    }

    /**
     * Create leave request
     */
    public function createLeave(Request $request)
    {
        $user = $request->user();

        // Check if this is a Lieu Leave type
        $leaveType = null;
        if ($request->leave_type_id) {
            $leaveType = LeaveType::find($request->leave_type_id);
        }
        $isLieuLeave = $leaveType && strtolower($leaveType->code) === 'lieu';

        // Build validation rules - Lieu Leave allows past dates
        $startDateRule = $isLieuLeave ? 'required|date' : 'required|date|after_or_equal:today';
        
        $rules = [
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => $startDateRule,
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_half' => 'in:full,first_half,second_half',
            'end_half' => 'in:full,first_half,second_half',
            'reason' => 'required|string|max:1000',
            'contact_phone' => 'nullable|string|max:20',
            'days_note' => 'nullable|string|max:500',
            'lieu_date' => $isLieuLeave ? 'required|date|before_or_equal:today' : 'nullable|date',
            'emergency_contact' => 'nullable|string|max:100',
            'emergency_phone' => 'nullable|string|max:20',
            'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ];

        $messages = [
            'lieu_date.required' => 'Please specify the date you worked that entitles you to this lieu leave.',
            'lieu_date.before_or_equal' => 'The worked date must be today or a past date.',
        ];

        $validator = Validator::make($request->all(), $rules, $messages);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!$leaveType) {
            $leaveType = LeaveType::findOrFail($request->leave_type_id);
        }

        // Check minimum notice days (skip for Lieu Leave)
        $startDate = Carbon::parse($request->start_date);
        if (!$isLieuLeave) {
            $noticeDays = now()->diffInDays($startDate, false);
            
            if ($noticeDays < $leaveType->min_notice_days) {
                return response()->json([
                    'message' => "This leave type requires at least {$leaveType->min_notice_days} days notice."
                ], 422);
            }
        }

        // For Lieu Leave, validate the worked date hasn't been used already
        if ($isLieuLeave && $request->lieu_date) {
            $lieuDateUsed = LeaveRequest::where('user_id', $user->id)
                ->where('lieu_date', $request->lieu_date)
                ->whereIn('status', ['pending', 'hod_approved', 'approved'])
                ->exists();

            if ($lieuDateUsed) {
                return response()->json([
                    'message' => 'You have already applied for lieu leave for this worked date.'
                ], 422);
            }
        }

        // Calculate total days
        $totalDays = LeaveRequest::calculateDays(
            $request->start_date,
            $request->end_date,
            $request->start_half ?? 'full',
            $request->end_half ?? 'full'
        );

        if ($totalDays <= 0) {
            return response()->json([
                'message' => 'Invalid date range. Please select working days.'
            ], 422);
        }

        // Check max consecutive days
        if ($leaveType->max_consecutive_days && $totalDays > $leaveType->max_consecutive_days) {
            return response()->json([
                'message' => "Maximum {$leaveType->max_consecutive_days} consecutive days allowed for this leave type."
            ], 422);
        }

        // Check available balance
        $year = $startDate->year;
        LeaveBalance::initializeForUser($user->id, $year);
        
        $balance = LeaveBalance::where('user_id', $user->id)
            ->where('leave_type_id', $leaveType->id)
            ->where('year', $year)
            ->first();

        $availableDays = $balance->available_days;
        
        if ($totalDays > $availableDays) {
            return response()->json([
                'message' => "Insufficient leave balance. Available: {$availableDays} days, Requested: {$totalDays} days."
            ], 422);
        }

        // Check for overlapping requests
        $hasOverlap = LeaveRequest::forUser($user->id)
            ->overlapping($request->start_date, $request->end_date)
            ->exists();

        if ($hasOverlap) {
            return response()->json([
                'message' => 'You already have a leave request for this period.'
            ], 422);
        }

        // Handle attachment upload
        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('leave-attachments', 'public');
        }

        // Check if attachment is required
        if ($leaveType->requires_attachment && !$attachmentPath) {
            return response()->json([
                'message' => 'Attachment is required for this leave type.'
            ], 422);
        }

        // Create leave request
        $leaveRequest = LeaveRequest::create([
            'user_id' => $user->id,
            'leave_type_id' => $request->leave_type_id,
            'department_id' => $user->department_id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'lieu_date' => $isLieuLeave ? $request->lieu_date : null,
            'total_days' => $totalDays,
            'start_half' => $request->start_half ?? 'full',
            'end_half' => $request->end_half ?? 'full',
            'reason' => $request->reason,
            'contact_phone' => $request->contact_phone,
            'days_note' => $request->days_note,
            'attachment_path' => $attachmentPath,
            'emergency_contact' => $request->emergency_contact,
            'emergency_phone' => $request->emergency_phone,
            'status' => 'pending',
        ]);

        // Update pending days in balance
        $balance->pending_days += $totalDays;
        $balance->save();

        // Notify department admins
        $this->notifyAdmins($leaveRequest);

        $leaveRequest->load(['leaveType', 'user']);

        return response()->json([
            'success' => true,
            'message' => 'Leave request submitted successfully',
            'data' => $leaveRequest
        ], 201);
    }

    /**
     * Get leave request details
     */
    public function getLeave(Request $request, $id)
    {
        $user = $request->user();
        
        $leaveRequest = LeaveRequest::with(['user', 'leaveType', 'department', 'approvedBy'])
            ->findOrFail($id);

        // Check authorization
        if (!$user->isAdmin() && !$user->isHod() && $leaveRequest->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $leaveRequest
        ]);
    }

    /**
     * Approve leave request
     * HOD: First level approval for employee/senior_employee requests (except Procurement)
     * Admin: Final approval for all requests + direct approval for Procurement and HOD requests
     */
    public function approveLeave(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user->isAdmin() && !$user->isHod()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $leaveRequest = LeaveRequest::with('user')->findOrFail($id);

        // Check if the requester is from HR department
        $isHREmployee = $leaveRequest->user && $leaveRequest->user->isHR();

        // Determine what action to take based on approver role and request status
        if ($user->isAdmin()) {
            // Admin can approve:
            // 1. HOD requests that are pending -> directly approve (HOD has no HOD above them)
            // 2. HR department employee requests that are pending -> directly approve (skip HOD)
            // 3. Employee/Senior Employee requests that are hod_approved -> final approve
            if ($leaveRequest->status === 'pending' && $leaveRequest->user->role === 'hod') {
                // HOD's request - direct admin approval (HODs don't need HOD approval)
                $leaveRequest->approveByAdmin($user->id, $request->notes);
                $message = 'Leave request approved successfully';
            } elseif ($leaveRequest->status === 'pending' && $isHREmployee && in_array($leaveRequest->user->role, ['employee', 'senior_employee'])) {
                // HR employee request - direct admin approval (skip HOD)
                $leaveRequest->approveByAdmin($user->id, $request->notes);
                $message = 'Leave request approved successfully';
            } elseif ($leaveRequest->status === 'hod_approved') {
                // Employee/Senior Employee request after HOD approval - final admin approval
                $leaveRequest->approveByAdmin($user->id, $request->notes);
                $message = 'Leave request fully approved';
            } elseif ($leaveRequest->status === 'pending' && in_array($leaveRequest->user->role, ['employee', 'senior_employee'])) {
                // Non-HR Employee/Senior Employee requests MUST be approved by HOD first
                return response()->json([
                    'message' => 'This request must be approved by the HOD first before admin approval.'
                ], 400);
            } else {
                return response()->json([
                    'message' => 'This request cannot be approved at this stage.'
                ], 400);
            }
        } else {
            // HOD can only approve pending employee/senior_employee requests (not from Procurement)
            if ($leaveRequest->status !== 'pending') {
                return response()->json([
                    'message' => 'This request has already been processed or is pending admin approval.'
                ], 400);
            }

            // Check if the requester is an employee or senior_employee (not HOD or Admin)
            if (!in_array($leaveRequest->user->role, ['employee', 'senior_employee'])) {
                return response()->json([
                    'message' => 'HOD requests must be approved by the admin.'
                ], 403);
            }

            // HR employees go directly to admin - HOD cannot approve
            if ($isHREmployee) {
                return response()->json([
                    'message' => 'HR department leave requests are approved directly by admin.'
                ], 403);
            }

            // Check department permission
            $managedDepts = $user->managed_department_ids ?? [];
            if (empty($managedDepts) && $user->department_id) {
                $managedDepts = [$user->department_id];
            }
            if (!in_array($leaveRequest->department_id, $managedDepts)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $leaveRequest->approveByHod($user->id, $request->notes);
            $message = 'Leave request approved by HOD. Pending final admin approval.';
        }

        $leaveRequest->load(['user', 'leaveType', 'approvedBy', 'hodApprovedBy', 'adminApprovedBy']);

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $leaveRequest
        ]);
    }

    /**
     * Reject leave request
     * Both HOD and Admin can reject at their respective stages
     */
    public function rejectLeave(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user->isAdmin() && !$user->isHod()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $leaveRequest = LeaveRequest::with('user')->findOrFail($id);

        // Check if the request can be rejected
        if (!in_array($leaveRequest->status, ['pending', 'hod_approved'])) {
            return response()->json([
                'message' => 'This request has already been processed.'
            ], 400);
        }

        // Check permissions
        if ($user->isHod()) {
            // HOD can only reject pending employee/senior_employee requests
            if ($leaveRequest->status !== 'pending' || !in_array($leaveRequest->user->role, ['employee', 'senior_employee'])) {
                return response()->json([
                    'message' => 'You can only reject pending employee or senior employee requests.'
                ], 403);
            }

            $managedDepts = $user->managed_department_ids ?? [];
            if (empty($managedDepts) && $user->department_id) {
                $managedDepts = [$user->department_id];
            }
            if (!in_array($leaveRequest->department_id, $managedDepts)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $leaveRequest->reject($user->id, $request->reason, $request->notes);

        $leaveRequest->load(['user', 'leaveType', 'approvedBy']);

        return response()->json([
            'success' => true,
            'message' => 'Leave request rejected',
            'data' => $leaveRequest
        ]);
    }

    /**
     * Cancel leave request (by employee)
     */
    public function cancelLeave(Request $request, $id)
    {
        $user = $request->user();
        
        $leaveRequest = LeaveRequest::findOrFail($id);

        if ($leaveRequest->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!in_array($leaveRequest->status, ['pending', 'approved'])) {
            return response()->json([
                'message' => 'Cannot cancel this leave request.'
            ], 400);
        }

        // For approved leaves, check if it hasn't started yet
        if ($leaveRequest->status === 'approved' && $leaveRequest->start_date <= now()) {
            return response()->json([
                'message' => 'Cannot cancel a leave that has already started.'
            ], 400);
        }

        $leaveRequest->cancel();

        return response()->json([
            'success' => true,
            'message' => 'Leave request cancelled successfully'
        ]);
    }

    /**
     * Get leave statistics
     */
    public function getStatistics(Request $request)
    {
        $user = $request->user();
        $year = $request->get('year', date('Y'));

        if ($user->isAdmin() || $user->isHod()) {
            // Admin/HOD statistics
            $query = LeaveRequest::forYear($year);
            
            $managedDepts = [];
            if ($user->isHod()) {
                $managedDepts = $user->managed_department_ids ?? [];
                if (empty($managedDepts) && $user->department_id) {
                    $managedDepts = [$user->department_id];
                }
                $query->whereIn('department_id', $managedDepts);
            }

            $stats = [
                'pending_count' => (clone $query)->pending()->count(),
                'approved_count' => (clone $query)->approved()->count(),
                'rejected_count' => (clone $query)->rejected()->count(),
                'total_requests' => (clone $query)->count(),
                'total_days_taken' => (clone $query)->approved()->sum('total_days'),
                'employees_on_leave_today' => LeaveRequest::approved()
                    ->where('start_date', '<=', now())
                    ->where('end_date', '>=', now())
                    ->when($user->isHod() && !empty($managedDepts), function ($q) use ($managedDepts) {
                        $q->whereIn('department_id', $managedDepts);
                    })
                    ->count(),
            ];
        } else {
            // Employee statistics
            $balances = LeaveBalance::getBalancesForUser($user->id, $year);
            
            $stats = [
                'total_entitlement' => $balances->sum('total_entitlement'),
                'total_used' => $balances->sum('used_days'),
                'total_pending' => $balances->sum('pending_days'),
                'total_available' => $balances->sum('available_days'),
                'pending_requests' => LeaveRequest::forUser($user->id)->forYear($year)->pending()->count(),
                'approved_requests' => LeaveRequest::forUser($user->id)->forYear($year)->approved()->count(),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }

    /**
     * Get leave calendar data
     */
    public function getCalendar(Request $request)
    {
        $user = $request->user();
        $year = $request->get('year', date('Y'));
        $month = $request->get('month', date('m'));

        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $query = LeaveRequest::with(['user', 'leaveType'])
            ->whereIn('status', ['approved', 'pending'])
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('start_date', [$startDate, $endDate])
                  ->orWhereBetween('end_date', [$startDate, $endDate])
                  ->orWhere(function ($q2) use ($startDate, $endDate) {
                      $q2->where('start_date', '<=', $startDate)
                         ->where('end_date', '>=', $endDate);
                  });
            });

        // Filter by department for dept admin
        if ($user->isHod()) {
            $managedDepts = $user->managed_department_ids ?? [];
            if (empty($managedDepts) && $user->department_id) {
                $managedDepts = [$user->department_id];
            }
            $query->whereIn('department_id', $managedDepts);
        } elseif ($user->isEmployee()) {
            $query->where('user_id', $user->id);
        }

        $leaves = $query->get();

        // Get holidays
        $holidays = Holiday::whereBetween('date', [$startDate, $endDate])
            ->where('is_active', true)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'leaves' => $leaves,
                'holidays' => $holidays,
            ]
        ]);
    }

    /**
     * Get team on leave for a specific date
     */
    public function getTeamOnLeave(Request $request)
    {
        $user = $request->user();
        $date = $request->get('date', now()->format('Y-m-d'));

        $query = LeaveRequest::approved()
            ->with(['user', 'leaveType'])
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date);

        if ($user->isHod()) {
            $managedDepts = $user->managed_department_ids ?? [];
            if (empty($managedDepts) && $user->department_id) {
                $managedDepts = [$user->department_id];
            }
            $query->whereIn('department_id', $managedDepts);
        } elseif ($user->isEmployee()) {
            // Show colleagues from same department
            $query->where('department_id', $user->department_id);
        }

        $onLeave = $query->get();

        return response()->json([
            'success' => true,
            'data' => $onLeave
        ]);
    }

    /**
     * Notify admins and HOD about new leave request via in-app notification and email
     */
    private function notifyAdmins(LeaveRequest $leaveRequest)
    {
        $leaveRequest->load(['user', 'leaveType', 'department']);
        $user = $leaveRequest->user;
        
        // Get HR department ID (HR employees skip HOD, go directly to Admin)
        $hrDeptId = \App\Models\Department::where('name', 'HR')->value('id');
        $isHR = $leaveRequest->department_id == $hrDeptId;
        
        // Always get all admins for notification
        $adminUsers = \App\Models\User::where('role', 'admin')->get();
        
        // Get the relevant HOD (if applicable)
        $hodUsers = collect();
        if ($user->role !== 'hod' && !$isHR) {
            // Regular employees and senior employees - get their department HOD
            $hodUsers = \App\Models\User::where('role', 'hod')
                ->where(function ($q) use ($leaveRequest) {
                    $q->whereJsonContains('managed_department_ids', $leaveRequest->department_id)
                      ->orWhere('department_id', $leaveRequest->department_id);
                })->get();
        }
        
        // Determine notification title based on context
        $title = 'New Leave Request';
        if ($user->role === 'hod') {
            $title = 'New Leave Request from HOD';
        } elseif ($isHR) {
            $title = 'New Leave Request (Procurement)';
        }
        
        $notificationMessage = "{$leaveRequest->user->name} has requested {$leaveRequest->total_days} day(s) of {$leaveRequest->leaveType->name} from {$leaveRequest->start_date->format('M d')} to {$leaveRequest->end_date->format('M d, Y')}.";
        
        // Notify HODs (in-app + email)
        foreach ($hodUsers as $hodUser) {
            // In-app notification
            Notification::create([
                'user_id' => $hodUser->id,
                'type' => 'leave_request',
                'title' => $title,
                'message' => $notificationMessage,
                'read_status' => 0,
            ]);
            
            // Send email notification to HOD
            try {
                $hodUser->notify(new LeaveRequestSubmittedNotification($leaveRequest, 'hod'));
                Log::info("Leave request email sent to HOD: {$hodUser->email} for leave request #{$leaveRequest->id}");
            } catch (\Exception $e) {
                Log::error("Failed to send leave request email to HOD {$hodUser->email}: " . $e->getMessage());
            }
        }
        
        // Notify Admins (in-app + email)
        foreach ($adminUsers as $adminUser) {
            // In-app notification
            Notification::create([
                'user_id' => $adminUser->id,
                'type' => 'leave_request',
                'title' => $title,
                'message' => $notificationMessage,
                'read_status' => 0,
            ]);
            
            // Send email notification to Admin
            try {
                $adminUser->notify(new LeaveRequestSubmittedNotification($leaveRequest, 'admin'));
                Log::info("Leave request email sent to Admin: {$adminUser->email} for leave request #{$leaveRequest->id}");
            } catch (\Exception $e) {
                Log::error("Failed to send leave request email to Admin {$adminUser->email}: " . $e->getMessage());
            }
        }
    }

    // ============ HOLIDAYS ============

    /**
     * Get all holidays
     */
    public function getHolidays(Request $request)
    {
        $year = $request->get('year', date('Y'));
        
        $holidays = Holiday::forYear($year)
            ->orderBy('date')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $holidays
        ]);
    }

    /**
     * Create holiday (Super Admin only)
     */
    public function createHoliday(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'date' => 'required|date',
            'description' => 'nullable|string',
            'is_recurring' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $holiday = Holiday::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Holiday created successfully',
            'data' => $holiday
        ], 201);
    }

    /**
     * Update holiday (Super Admin only)
     */
    public function updateHoliday(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $holiday = Holiday::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'string|max:100',
            'date' => 'date',
            'description' => 'nullable|string',
            'is_recurring' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $holiday->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Holiday updated successfully',
            'data' => $holiday
        ]);
    }

    /**
     * Delete holiday (Super Admin only)
     */
    public function deleteHoliday(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $holiday = Holiday::findOrFail($id);
        $holiday->delete();

        return response()->json([
            'success' => true,
            'message' => 'Holiday deleted successfully'
        ]);
    }

    /**
     * Calculate leave days (utility endpoint)
     */
    public function calculateDays(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_half' => 'in:full,first_half,second_half',
            'end_half' => 'in:full,first_half,second_half',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $days = LeaveRequest::calculateDays(
            $request->start_date,
            $request->end_date,
            $request->start_half ?? 'full',
            $request->end_half ?? 'full'
        );

        return response()->json([
            'success' => true,
            'data' => [
                'total_days' => $days
            ]
        ]);
    }
}
