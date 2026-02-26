<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceRole;
use App\Models\Branch;
use App\Models\User;
use App\Models\UserBranchAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BranchController extends Controller
{
    /**
     * List all branches
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Admin, attendance admin, or HR department users can view branches
        if (!$user->isAttendanceAdmin() && !$user->isAdmin() && !$user->isHR()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Branch::query()
            ->withCount(['activeUsers as employee_count'])
            ->with('branchManager:id,name,username');

        // Filter by status
        $status = $request->input('status', 'active');
        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }
        // 'all' - no filter

        // Filter by city
        if ($request->filled('city')) {
            $query->where('city', $request->city);
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->input('sort_by', 'name');
        $sortDir = $request->input('sort_dir', 'asc');
        $query->orderBy($sortBy, $sortDir);

        $branches = $query->get();

        // Add today's attendance stats for each branch
        $today = now()->toDateString();
        $branches->each(function ($branch) use ($today) {
            $todayAttendance = Attendance::where('branch_id', $branch->id)
                ->whereDate('date', $today)
                ->where('attendance_method', Attendance::METHOD_GPS_APP)
                ->get();

            $branch->today_stats = [
                'checked_in' => $todayAttendance->filter(fn($a) => $a->hasCheckedIn())->count(),
                'checked_out' => $todayAttendance->filter(fn($a) => $a->hasCheckedOut())->count(),
                'present' => $todayAttendance->whereIn('attendance_status', ['present', 'late'])->count(),
                'late' => $todayAttendance->where('is_late', true)->count(),
                'attendance_rate' => $branch->employee_count > 0
                    ? round(($todayAttendance->count() / $branch->employee_count) * 100, 1)
                    : 0,
            ];

            // Add aliased fields for frontend compatibility
            $branch->work_start_time = $branch->operating_hours_start?->format('H:i');
            $branch->work_end_time = $branch->operating_hours_end?->format('H:i');
            $branch->gps_radius = $branch->allowed_radius_meters;
        });

        return response()->json([
            'branches' => $branches,
            'total' => $branches->count(),
        ]);
    }

    /**
     * Get single branch details
     */
    public function show(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branch = Branch::with(['branchManager:id,name,username,email', 'timeSettings'])
            ->withCount(['activeUsers as employee_count'])
            ->findOrFail($id);

        // Get today's attendance stats
        $today = now()->toDateString();
        $todayAttendance = Attendance::where('branch_id', $branch->id)
            ->whereDate('date', $today)
            ->where('attendance_method', Attendance::METHOD_GPS_APP)
            ->get();

        $branch->today_stats = [
            'total_employees' => $branch->employee_count,
            'checked_in' => $todayAttendance->filter(fn($a) => $a->hasCheckedIn())->count(),
            'checked_out' => $todayAttendance->filter(fn($a) => $a->hasCheckedOut())->count(),
            'present' => $todayAttendance->whereIn('attendance_status', ['present', 'late'])->count(),
            'late' => $todayAttendance->where('is_late', true)->count(),
            'absent' => $branch->employee_count - $todayAttendance->count(),
        ];

        return response()->json($branch);
    }

    /**
     * Create a new branch
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'code' => 'required|string|max:20|unique:branches,code',
            'branch_type' => 'required|in:headquarters,regional,outlet',
            'address' => 'required|string',
            'city' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'province' => 'nullable|string|max:100',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'allowed_radius_meters' => 'nullable|integer|min:10|max:500',
            'contact_number' => 'nullable|string|max:20',
            'operating_hours_start' => 'nullable|date_format:H:i',
            'operating_hours_end' => 'nullable|date_format:H:i',
            'branch_manager_id' => 'nullable|exists:users,id',
        ]);

        $validated['code'] = strtoupper($validated['code']);
        $validated['created_by'] = $user->id;
        $validated['updated_by'] = $user->id;
        $validated['allowed_radius_meters'] = $validated['allowed_radius_meters'] ?? 100;

        $branch = Branch::create($validated);

        return response()->json([
            'message' => 'Branch created successfully',
            'branch' => $branch,
        ], 201);
    }

    /**
     * Update a branch
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branch = Branch::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'code' => ['sometimes', 'string', 'max:20', Rule::unique('branches', 'code')->ignore($branch->id)],
            'branch_type' => 'sometimes|in:headquarters,regional,outlet',
            'address' => 'sometimes|string',
            'city' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'province' => 'nullable|string|max:100',
            'latitude' => 'sometimes|numeric|between:-90,90',
            'longitude' => 'sometimes|numeric|between:-180,180',
            'allowed_radius_meters' => 'sometimes|integer|min:10|max:500',
            'contact_number' => 'nullable|string|max:20',
            'operating_hours_start' => 'nullable|date_format:H:i',
            'operating_hours_end' => 'nullable|date_format:H:i',
            'branch_manager_id' => 'nullable|exists:users,id',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $validated['updated_by'] = $user->id;

        $branch->update($validated);

        return response()->json([
            'message' => 'Branch updated successfully',
            'branch' => $branch->fresh(),
        ]);
    }

    /**
     * Activate a branch
     */
    public function activate(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branch = Branch::findOrFail($id);
        $branch->update([
            'is_active' => true,
            'updated_by' => $user->id,
        ]);

        return response()->json([
            'message' => 'Branch activated successfully',
            'branch' => $branch,
        ]);
    }

    /**
     * Deactivate a branch
     */
    public function deactivate(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branch = Branch::findOrFail($id);
        $branch->update([
            'is_active' => false,
            'updated_by' => $user->id,
        ]);

        return response()->json([
            'message' => 'Branch deactivated successfully',
            'branch' => $branch,
        ]);
    }

    /**
     * Delete a branch
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branch = Branch::withCount('activeUsers')->findOrFail($id);

        // Check if branch has assigned employees
        if ($branch->active_users_count > 0) {
            return response()->json([
                'message' => 'Cannot delete branch with assigned employees. Please reassign employees first.',
            ], 400);
        }

        // Soft delete
        $branch->delete();

        return response()->json([
            'message' => 'Branch deleted successfully',
        ]);
    }

    /**
     * Get employees assigned to a branch
     */
    public function employees(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branch = Branch::findOrFail($id);

        $query = $branch->users()
            ->select('users.id', 'users.name', 'users.username', 'users.email', 'users.emp_code', 'users.profile_picture', 'users.department_id')
            ->with('departmentRelation:id,name');

        // Filter by status
        $status = $request->input('status', 'active');
        if ($status !== 'all') {
            $query->wherePivot('status', $status);
        }

        // Filter by primary branch
        if ($request->has('is_primary')) {
            $query->wherePivot('is_primary_branch', $request->boolean('is_primary'));
        }

        $employees = $query->get();

        // Add recent attendance info
        $today = now()->toDateString();
        $employees->each(function ($employee) use ($today, $id) {
            $recentAttendance = Attendance::where('user_id', $employee->id)
                ->where('branch_id', $id)
                ->where('attendance_method', Attendance::METHOD_GPS_APP)
                ->orderBy('date', 'desc')
                ->first();

            $todayAttendance = Attendance::where('user_id', $employee->id)
                ->where('branch_id', $id)
                ->whereDate('date', $today)
                ->where('attendance_method', Attendance::METHOD_GPS_APP)
                ->first();

            $employee->assignment_info = [
                'is_primary_branch' => $employee->pivot->is_primary_branch,
                'assigned_at' => $employee->pivot->assigned_at,
                'effective_from' => $employee->pivot->effective_from,
                'effective_to' => $employee->pivot->effective_to,
                'status' => $employee->pivot->status,
            ];

            $employee->today_status = $todayAttendance ? [
                'checked_in' => $todayAttendance->hasCheckedIn(),
                'check_in_time' => $todayAttendance->in_time?->format('H:i'),
                'checked_out' => $todayAttendance->hasCheckedOut(),
                'check_out_time' => $todayAttendance->out_time?->format('H:i'),
                'status' => $todayAttendance->attendance_status,
            ] : null;

            $employee->last_attendance = $recentAttendance?->date?->format('Y-m-d');
        });

        return response()->json([
            'employees' => $employees,
            'total' => $employees->count(),
        ]);
    }

    /**
     * Assign an employee to a branch
     */
    public function assignEmployee(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branch = Branch::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'is_primary_branch' => 'boolean',
            'effective_from' => 'nullable|date',
            'effective_to' => 'nullable|date|after:effective_from',
            'notes' => 'nullable|string',
        ]);

        $employeeUser = User::findOrFail($validated['user_id']);

        // Check if user has branch_employee attendance role
        if (!$employeeUser->isAttendanceBranchEmployee()) {
            // Auto-assign branch_employee role if not set
            AttendanceRole::updateOrCreate(
                ['user_id' => $employeeUser->id],
                [
                    'role' => AttendanceRole::ROLE_BRANCH_EMPLOYEE,
                    'assigned_by' => $user->id,
                    'assigned_at' => now(),
                    'is_active' => true,
                ]
            );
        }

        // Check if already assigned to this branch
        $existingAssignment = UserBranchAssignment::where('user_id', $validated['user_id'])
            ->where('branch_id', $id)
            ->where('status', 'active')
            ->first();

        if ($existingAssignment) {
            return response()->json([
                'message' => 'Employee is already assigned to this branch.',
            ], 400);
        }

        // If setting as primary, remove primary from other branches
        if ($request->boolean('is_primary_branch')) {
            UserBranchAssignment::where('user_id', $validated['user_id'])
                ->where('is_primary_branch', true)
                ->update(['is_primary_branch' => false]);
        }

        $assignment = UserBranchAssignment::create([
            'user_id' => $validated['user_id'],
            'branch_id' => $id,
            'is_primary_branch' => $request->boolean('is_primary_branch', false),
            'assigned_by' => $user->id,
            'assigned_at' => now(),
            'effective_from' => $validated['effective_from'] ?? now()->toDateString(),
            'effective_to' => $validated['effective_to'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'Employee assigned to branch successfully',
            'assignment' => $assignment->load('user:id,name,username,email', 'branch:id,name,code'),
        ], 201);
    }

    /**
     * Remove an employee from a branch
     */
    public function removeEmployee(Request $request, $branchId, $userId): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = UserBranchAssignment::where('branch_id', $branchId)
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->first();

        if (!$assignment) {
            return response()->json([
                'message' => 'Employee assignment not found.',
            ], 404);
        }

        $assignment->update([
            'status' => 'inactive',
        ]);

        return response()->json([
            'message' => 'Employee removed from branch successfully',
        ]);
    }

    /**
     * Get branch statistics
     */
    public function statistics(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin() && !$user->isAttendanceFinance()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branch = Branch::withCount('activeUsers')->findOrFail($id);

        $dateFrom = $request->input('date_from', now()->startOfMonth()->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());

        $attendances = Attendance::where('branch_id', $id)
            ->where('attendance_method', Attendance::METHOD_GPS_APP)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->get();

        $totalRecords = $attendances->count();
        $presentCount = $attendances->whereIn('attendance_status', ['present', 'late', 'early_leave'])->count();
        $lateCount = $attendances->where('is_late', true)->count();
        $avgWorkingHours = $attendances->whereNotNull('working_hours')->avg('working_hours') ?? 0;
        $avgCheckInTime = $attendances->whereNotNull('in_time')->avg(function ($a) {
            return $a->in_time->format('H') * 60 + $a->in_time->format('i');
        });

        // GPS validation success rate
        $gpsValidationFailures = DB::table('gps_validation_failures')
            ->where('branch_id', $id)
            ->whereBetween('attempt_time', [$dateFrom, $dateTo])
            ->count();

        $totalAttempts = $totalRecords + $gpsValidationFailures;
        $gpsSuccessRate = $totalAttempts > 0 ? round(($totalRecords / $totalAttempts) * 100, 1) : 100;

        return response()->json([
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
            ],
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'statistics' => [
                'total_employees' => $branch->active_users_count,
                'total_attendance_records' => $totalRecords,
                'present_count' => $presentCount,
                'late_count' => $lateCount,
                'attendance_rate' => $branch->active_users_count > 0
                    ? round(($totalRecords / ($branch->active_users_count * now()->diffInDaysFiltered(fn($d) => !$d->isWeekend(), \Carbon\Carbon::parse($dateFrom)))) * 100, 1)
                    : 0,
                'punctuality_rate' => $presentCount > 0 ? round((($presentCount - $lateCount) / $presentCount) * 100, 1) : 100,
                'average_working_hours' => round($avgWorkingHours, 2),
                'average_check_in_time' => $avgCheckInTime
                    ? sprintf('%02d:%02d', floor($avgCheckInTime / 60), $avgCheckInTime % 60)
                    : null,
                'gps_validation_success_rate' => $gpsSuccessRate,
            ],
        ]);
    }

    /**
     * Update branch time settings
     */
    public function updateTimeSettings(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branch = Branch::findOrFail($id);

        $validated = $request->validate([
            'work_start_time' => 'nullable|date_format:H:i',
            'work_end_time' => 'nullable|date_format:H:i',
            'late_grace_minutes' => 'nullable|integer|min:0|max:60',
            'gps_radius' => 'nullable|integer|min:10|max:500',
        ]);

        // Update branch settings
        if (isset($validated['work_start_time'])) {
            $branch->operating_hours_start = $validated['work_start_time'];
        }
        if (isset($validated['work_end_time'])) {
            $branch->operating_hours_end = $validated['work_end_time'];
        }
        if (isset($validated['gps_radius'])) {
            $branch->allowed_radius_meters = $validated['gps_radius'];
        }
        if (isset($validated['late_grace_minutes'])) {
            $branch->late_grace_minutes = $validated['late_grace_minutes'];
        }

        $branch->save();

        return response()->json([
            'message' => 'Branch time settings updated successfully',
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'work_start_time' => $branch->operating_hours_start,
                'work_end_time' => $branch->operating_hours_end,
                'gps_radius' => $branch->allowed_radius_meters,
                'late_grace_minutes' => $branch->late_grace_minutes,
            ],
        ]);
    }
}
