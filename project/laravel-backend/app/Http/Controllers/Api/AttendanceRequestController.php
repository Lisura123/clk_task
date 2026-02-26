<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceRequest;
use App\Models\Attendance;
use App\Models\User;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class AttendanceRequestController extends Controller
{
    /**
     * Get attendance requests for the current user (employee view)
     */
    public function myRequests(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $query = AttendanceRequest::where('user_id', $user->id)
            ->with(['reviewer:id,name,username']);
        
        // Filter by status
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        
        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        
        $requests = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));
        
        return response()->json($requests);
    }

    /**
     * Create a new attendance request (employee)
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $validator = Validator::make($request->all(), [
            'date' => 'required|date|before_or_equal:today',
            'in_time' => 'nullable|date_format:H:i',
            'out_time' => 'nullable|date_format:H:i',
            'reason_type' => 'required|in:client_visit,field_work,training,meeting,other',
            'reason' => 'required|string|max:1000',
            'location' => 'nullable|string|max:255',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        // Check if request already exists for this date
        $existingRequest = AttendanceRequest::where('user_id', $user->id)
            ->whereDate('date', $request->date)
            ->whereIn('status', ['pending', 'approved'])
            ->first();
        
        if ($existingRequest) {
            return response()->json([
                'message' => 'You already have a pending or approved attendance request for this date.'
            ], 422);
        }
        
        $attendanceRequest = AttendanceRequest::create([
            'user_id' => $user->id,
            'date' => $request->date,
            'in_time' => $request->in_time,
            'out_time' => $request->out_time,
            'reason_type' => $request->reason_type,
            'reason' => $request->reason,
            'location' => $request->location,
            'status' => 'pending',
        ]);
        
        // Notify HOD(s) of the user's department
        $this->notifyHODs($user, $attendanceRequest);
        
        return response()->json([
            'message' => 'Attendance request submitted successfully',
            'request' => $attendanceRequest->load('user:id,name,username,emp_code')
        ], 201);
    }

    /**
     * Get pending requests for HOD approval
     */
    public function pendingForApproval(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Check if user is HOD or admin
        if (!$user->isAdmin() && !$user->isHod()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $query = AttendanceRequest::with([
            'user:id,name,username,emp_code,department_id',
            'user.departmentRelation:id,name',
        ]);
        
        // HOD can only see requests from their managed departments
        if ($user->isHod() && !$user->isAdmin()) {
            $managedDeptIds = $user->managed_department_ids ?? [];
            if (!empty($managedDeptIds)) {
                $query->whereHas('user', function ($q) use ($managedDeptIds) {
                    $q->whereIn('department_id', $managedDeptIds);
                });
            } else {
                // No managed departments, return empty
                return response()->json([
                    'data' => [],
                    'total' => 0
                ]);
            }
        }
        
        // Filter by status
        $status = $request->get('status', 'pending');
        if ($status !== 'all') {
            $query->where('status', $status);
        }
        
        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        
        $requests = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));
        
        return response()->json($requests);
    }

    /**
     * Approve an attendance request (HOD)
     */
    public function approve(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        $attendanceRequest = AttendanceRequest::with('user')->findOrFail($id);
        
        // Check permissions
        if (!$this->canReviewRequest($user, $attendanceRequest)) {
            return response()->json(['message' => 'Unauthorized to review this request'], 403);
        }
        
        if (!$attendanceRequest->isPending()) {
            return response()->json(['message' => 'This request has already been reviewed'], 422);
        }
        
        $validator = Validator::make($request->all(), [
            'review_notes' => 'nullable|string|max:500',
            'in_time' => 'nullable|date_format:H:i',
            'out_time' => 'nullable|date_format:H:i',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        // Update with HOD-modified times if provided
        $attendanceRequest->update([
            'status' => 'approved',
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'review_notes' => $request->review_notes,
            'in_time' => $request->in_time ?? $attendanceRequest->in_time,
            'out_time' => $request->out_time ?? $attendanceRequest->out_time,
        ]);
        
        // Notify the employee
        Notification::create([
            'user_id' => $attendanceRequest->user_id,
            'triggered_by_id' => $user->id,
            'type' => 'attendance_request_approved',
            'title' => 'Attendance Request Approved',
            'message' => "Your attendance request for " . $attendanceRequest->date->format('M d, Y') . " has been approved by " . $user->name,
        ]);
        
        // Notify Procurement department users
        $this->notifyProcurement($attendanceRequest);
        
        return response()->json([
            'message' => 'Attendance request approved successfully',
            'request' => $attendanceRequest->fresh()->load(['user:id,name,username,emp_code', 'reviewer:id,name'])
        ]);
    }

    /**
     * Reject an attendance request (HOD)
     */
    public function reject(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        $attendanceRequest = AttendanceRequest::with('user')->findOrFail($id);
        
        // Check permissions
        if (!$this->canReviewRequest($user, $attendanceRequest)) {
            return response()->json(['message' => 'Unauthorized to review this request'], 403);
        }
        
        if (!$attendanceRequest->isPending()) {
            return response()->json(['message' => 'This request has already been reviewed'], 422);
        }
        
        $validator = Validator::make($request->all(), [
            'review_notes' => 'required|string|max:500',
        ]);
        
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        
        $attendanceRequest->update([
            'status' => 'rejected',
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'review_notes' => $request->review_notes,
        ]);
        
        // Notify the employee
        Notification::create([
            'user_id' => $attendanceRequest->user_id,
            'triggered_by_id' => $user->id,
            'type' => 'attendance_request_rejected',
            'title' => 'Attendance Request Rejected',
            'message' => "Your attendance request for " . $attendanceRequest->date->format('M d, Y') . " has been rejected. Reason: " . $request->review_notes,
        ]);
        
        return response()->json([
            'message' => 'Attendance request rejected',
            'request' => $attendanceRequest->fresh()->load(['user:id,name,username,emp_code', 'reviewer:id,name'])
        ]);
    }

    /**
     * Get approved requests for Procurement to add to attendance
     */
    public function approvedForProcurement(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Only Procurement can access this
        if (!$user->isHR() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $query = AttendanceRequest::with([
            'user:id,name,username,emp_code,department_id',
            'user.departmentRelation:id,name',
            'reviewer:id,name,username',
        ])->where('status', 'approved');
        
        // Filter by synced status
        $syncStatus = $request->get('sync_status', 'not_synced');
        if ($syncStatus === 'not_synced') {
            $query->where('synced_to_attendance', false);
        } elseif ($syncStatus === 'synced') {
            $query->where('synced_to_attendance', true);
        }
        
        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('date', '<=', $request->date_to);
        }
        
        $requests = $query->orderBy('reviewed_at', 'desc')
            ->paginate($request->get('per_page', 20));
        
        return response()->json($requests);
    }

    /**
     * Mark a request as synced to attendance (Procurement)
     */
    public function markAsSynced(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isHR() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $attendanceRequest = AttendanceRequest::findOrFail($id);
        
        if (!$attendanceRequest->isApproved()) {
            return response()->json(['message' => 'Only approved requests can be marked as synced'], 422);
        }
        
        $attendanceRequest->update(['synced_to_attendance' => true]);
        
        return response()->json([
            'message' => 'Request marked as synced to attendance',
            'request' => $attendanceRequest
        ]);
    }

    /**
     * Add approved request to main attendance table (Procurement)
     */
    public function addToAttendance(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isHR() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $attendanceRequest = AttendanceRequest::with('user')->findOrFail($id);
        
        if (!$attendanceRequest->isApproved()) {
            return response()->json(['message' => 'Only approved requests can be added to attendance'], 422);
        }
        
        if ($attendanceRequest->synced_to_attendance) {
            return response()->json(['message' => 'This request has already been added to attendance'], 422);
        }
        
        $empUser = $attendanceRequest->user;
        
        if (!$empUser->emp_code) {
            return response()->json(['message' => 'Employee does not have an employee code assigned'], 422);
        }
        
        // Check if attendance already exists for this date and user
        $existingAttendance = Attendance::where('emp_code', $empUser->emp_code)
            ->whereDate('date', $attendanceRequest->date)
            ->first();
        
        if ($existingAttendance) {
            // Update existing attendance
            $existingAttendance->update([
                'in_time' => $attendanceRequest->in_time ?? $existingAttendance->in_time,
                'out_time' => $attendanceRequest->out_time ?? $existingAttendance->out_time,
            ]);
        } else {
            // Create new attendance record
            Attendance::create([
                'emp_code' => $empUser->emp_code,
                'fp_code' => $empUser->fp_code ?? null,
                'date' => $attendanceRequest->date,
                'in_time' => $attendanceRequest->in_time,
                'out_time' => $attendanceRequest->out_time,
                'dept_name' => $empUser->departmentRelation?->name ?? $empUser->department ?? null,
            ]);
        }
        
        // Mark as synced
        $attendanceRequest->update(['synced_to_attendance' => true]);
        
        return response()->json([
            'message' => 'Attendance record ' . ($existingAttendance ? 'updated' : 'created') . ' successfully',
            'request' => $attendanceRequest->fresh()
        ]);
    }

    /**
     * Delete/withdraw an attendance request (employee - only pending)
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        $attendanceRequest = AttendanceRequest::findOrFail($id);
        
        // Only owner can delete, and only if pending
        if ($attendanceRequest->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        if (!$attendanceRequest->isPending()) {
            return response()->json(['message' => 'Only pending requests can be withdrawn'], 422);
        }
        
        $attendanceRequest->delete();
        
        return response()->json(['message' => 'Attendance request withdrawn successfully']);
    }

    /**
     * Get summary statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $stats = [
            'my_pending' => AttendanceRequest::where('user_id', $user->id)->pending()->count(),
            'my_approved' => AttendanceRequest::where('user_id', $user->id)->approved()->count(),
            'my_total' => AttendanceRequest::where('user_id', $user->id)->count(),
        ];
        
        // If HOD, add approval stats
        if ($user->isHod() || $user->isAdmin()) {
            $query = AttendanceRequest::query();
            
            if ($user->isHod() && !$user->isAdmin()) {
                $managedDeptIds = $user->managed_department_ids ?? [];
                if (!empty($managedDeptIds)) {
                    $query->whereHas('user', function ($q) use ($managedDeptIds) {
                        $q->whereIn('department_id', $managedDeptIds);
                    });
                }
            }
            
            $stats['pending_approval'] = (clone $query)->pending()->count();
        }
        
        // If Procurement, add sync stats
        if ($user->isHR() || $user->isAdmin()) {
            $stats['approved_not_synced'] = AttendanceRequest::approvedNotSynced()->count();
        }
        
        return response()->json($stats);
    }

    /**
     * Check if user can review this request
     */
    private function canReviewRequest(User $user, AttendanceRequest $request): bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        
        if ($user->isHod()) {
            $managedDeptIds = $user->managed_department_ids ?? [];
            return in_array($request->user->department_id, $managedDeptIds);
        }
        
        return false;
    }

    /**
     * Notify HODs of the user's department
     */
    private function notifyHODs(User $employee, AttendanceRequest $request): void
    {
        // Find HODs who manage the employee's department
        $hods = User::where('role', 'hod')
            ->where('status', 'active')
            ->get()
            ->filter(function ($hod) use ($employee) {
                $managedDeptIds = $hod->managed_department_ids ?? [];
                return in_array($employee->department_id, $managedDeptIds);
            });
        
        foreach ($hods as $hod) {
            Notification::create([
                'user_id' => $hod->id,
                'triggered_by_id' => $employee->id,
                'type' => 'attendance_request_pending',
                'title' => 'New Attendance Request',
                'message' => $employee->name . " has submitted an attendance request for " . $request->date->format('M d, Y') . " - " . ucwords(str_replace('_', ' ', $request->reason_type)),
            ]);
        }
    }

    /**
     * Notify Procurement department about approved request
     */
    private function notifyProcurement(AttendanceRequest $request): void
    {
        // Find all Procurement department users
        $procurementUsers = User::where('status', 'active')
            ->whereHas('departmentRelation', function ($q) {
                $q->whereRaw('LOWER(name) = ?', ['procurement']);
            })
            ->get();
        
        foreach ($procurementUsers as $procUser) {
            Notification::create([
                'user_id' => $procUser->id,
                'triggered_by_id' => $request->reviewed_by,
                'type' => 'attendance_request_approved_for_sync',
                'title' => 'Attendance Request Approved - Ready for Sync',
                'message' => $request->user->name . "'s attendance request for " . $request->date->format('M d, Y') . " has been approved and is ready to be added to attendance records.",
            ]);
        }
    }
}
