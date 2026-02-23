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
     * Get all leave requests (Admin only)
     */
    public function getAllLeaves(Request $request)
    {
        $user = $request->user();
        
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
     * Get pending leave requests (Admin only)
     * HOD sees: pending requests from employees in their department (except Procurement)
     * Admin sees: hod_approved requests (needing final approval) + pending HOD requests + pending Procurement requests
     */
    public function getPendingLeaves(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isAdmin() && !$user->isHod()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = LeaveRequest::with(['user', 'leaveType', 'department', 'hodApprovedBy', 'adminApprovedBy']);

        // Get Procurement department ID
        $procurementDeptId = \App\Models\Department::where('name', 'Procurement')->value('id');

        if ($user->isAdmin()) {
            // Admin sees:
            // 1. Requests from HODs that are pending (direct admin approval)
            // 2. Requests from employees/senior employees that have been approved by HOD (hod_approved)
            // 3. Requests from Procurement department employees (pending - they skip HOD approval)
            $query->where(function ($q) use ($procurementDeptId) {
                // HOD requests pending admin approval
                $q->where('status', 'pending')
                  ->whereHas('user', function ($uq) {
                      $uq->where('role', 'hod');
                  });
            })->orWhere(function ($q) {
                // Employee/Senior Employee requests that HOD approved, pending admin final approval
                $q->where('status', 'hod_approved');
            })->orWhere(function ($q) use ($procurementDeptId) {
                // Procurement department employees - pending requests go directly to admin
                if ($procurementDeptId) {
                    $q->where('status', 'pending')
                      ->where('department_id', $procurementDeptId)
                      ->whereHas('user', function ($uq) {
                          $uq->whereIn('role', ['employee', 'senior_employee']);
                      });
                }
            });
        } else {
            // HOD sees pending requests from employees and senior employees in their department
            // EXCEPT Procurement department (they go directly to admin)
            $managedDepts = $user->managed_department_ids ?? [];
            if (empty($managedDepts) && $user->department_id) {
                $managedDepts = [$user->department_id];
            }
            
            // Exclude Procurement department from HOD's view
            if ($procurementDeptId) {
                $managedDepts = array_filter($managedDepts, fn($id) => (int)$id !== (int)$procurementDeptId);
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

        $validator = Validator::make($request->all(), [
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date|after_or_equal:today',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_half' => 'in:full,first_half,second_half',
            'end_half' => 'in:full,first_half,second_half',
            'reason' => 'required|string|max:1000',
            'contact_phone' => 'nullable|string|max:20',
            'days_note' => 'nullable|string|max:500',
            'emergency_contact' => 'nullable|string|max:100',
            'emergency_phone' => 'nullable|string|max:20',
            'attachment' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $leaveType = LeaveType::findOrFail($request->leave_type_id);

        // Check minimum notice days
        $startDate = Carbon::parse($request->start_date);
        $noticeDays = now()->diffInDays($startDate, false);
        
        if ($noticeDays < $leaveType->min_notice_days) {
            return response()->json([
                'message' => "This leave type requires at least {$leaveType->min_notice_days} days notice."
            ], 422);
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

        // Check if the requester is from Procurement department
        $isProcurementEmployee = $leaveRequest->user && $leaveRequest->user->isProcurement();

        // Determine what action to take based on approver role and request status
        if ($user->isAdmin()) {
            // Admin can approve:
            // 1. HOD requests that are pending -> directly approve (HOD has no HOD above them)
            // 2. Procurement department employee requests that are pending -> directly approve (skip HOD)
            // 3. Employee/Senior Employee requests that are hod_approved -> final approve
            if ($leaveRequest->status === 'pending' && $leaveRequest->user->role === 'hod') {
                // HOD's request - direct admin approval (HODs don't need HOD approval)
                $leaveRequest->approveByAdmin($user->id, $request->notes);
                $message = 'Leave request approved successfully';
            } elseif ($leaveRequest->status === 'pending' && $isProcurementEmployee && in_array($leaveRequest->user->role, ['employee', 'senior_employee'])) {
                // Procurement employee request - direct admin approval (skip HOD)
                $leaveRequest->approveByAdmin($user->id, $request->notes);
                $message = 'Leave request approved successfully';
            } elseif ($leaveRequest->status === 'hod_approved') {
                // Employee/Senior Employee request after HOD approval - final admin approval
                $leaveRequest->approveByAdmin($user->id, $request->notes);
                $message = 'Leave request fully approved';
            } elseif ($leaveRequest->status === 'pending' && in_array($leaveRequest->user->role, ['employee', 'senior_employee'])) {
                // Non-Procurement Employee/Senior Employee requests MUST be approved by HOD first
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

            // Procurement employees go directly to admin - HOD cannot approve
            if ($isProcurementEmployee) {
                return response()->json([
                    'message' => 'Procurement department leave requests are approved directly by admin.'
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
        
        // Get Procurement department ID (Procurement employees skip HOD, go directly to Admin)
        $procurementDeptId = \App\Models\Department::where('name', 'Procurement')->value('id');
        $isProcurement = $leaveRequest->department_id == $procurementDeptId;
        
        // Always get all admins for notification
        $adminUsers = \App\Models\User::where('role', 'admin')->get();
        
        // Get the relevant HOD (if applicable)
        $hodUsers = collect();
        if ($user->role !== 'hod' && !$isProcurement) {
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
        } elseif ($isProcurement) {
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
