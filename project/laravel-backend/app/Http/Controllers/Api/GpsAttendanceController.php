<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceAuditLog;
use App\Models\AttendanceRole;
use App\Models\Branch;
use App\Models\Department;
use App\Models\DepartmentAttendanceSetting;
use App\Models\User;
use App\Services\GpsValidationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GpsAttendanceController extends Controller
{
    protected GpsValidationService $gpsService;

    public function __construct(GpsValidationService $gpsService)
    {
        $this->gpsService = $gpsService;
    }

    /**
     * Check user's attendance access and permissions
     * GPS Attendance is visible only to:
     * 1. Staff assigned to: CameraLK Majestic City, CameraLK Kandy, CameraLK Jaffna, CameraLK Batticaloa, CameraLK Tissamaharama
     * 2. Finance Department staff
     * 3. Admin users (for management purposes, but they don't need to mark attendance)
     */
    public function checkAccess(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Check if user is in Finance department
        $isFinanceDept = $user->department_name && strtolower($user->department_name) === 'finance';
        
        // Check if user is admin
        $isAdmin = $user->isAdmin();
        
        // Check if user is assigned to any GPS-required showroom
        $isAssignedToRequiredShowroom = $user->isGpsAttendanceRequired();
        
        // User has access if they are: Finance dept, assigned to required showroom, or admin
        $hasAccess = $isFinanceDept || $isAssignedToRequiredShowroom || $isAdmin;
        
        if (!$hasAccess) {
            return response()->json([
                'has_access' => false,
                'role' => 'none',
                'reason' => 'GPS Attendance is only available for staff at specific showrooms (Majestic City, Kandy, Jaffna, Batticaloa, Tissamaharama) and Finance Department.',
                'permissions' => [
                    'can_manage_branches' => false,
                    'can_view_all_reports' => false,
                    'can_mark_attendance' => false,
                    'can_approve_corrections' => false,
                    'can_export_data' => false,
                ],
                'assigned_branches' => [],
            ]);
        }

        $attendanceRole = $user->attendanceRole;
        $role = $attendanceRole ? $attendanceRole->role : 'none';
        $isAdminRole = $attendanceRole && $role === AttendanceRole::ROLE_ADMIN_PROCUREMENT;
        $isFinanceRole = $attendanceRole && $role === AttendanceRole::ROLE_FINANCE;
        $isBranchEmployee = $attendanceRole && $role === AttendanceRole::ROLE_BRANCH_EMPLOYEE;
        $isProcurement = $user->isProcurement(); // Check if user is in Procurement department

        // Get assigned branches for users who need GPS attendance
        $assignedBranches = [];
        if ($isAssignedToRequiredShowroom || $isFinanceDept) {
            $assignedBranches = $user->activeBranches()
                ->select('branches.id', 'branches.name', 'branches.code', 'branches.city', 'branches.latitude', 'branches.longitude', 'branches.allowed_radius_meters')
                ->get()
                ->map(function ($branch) {
                    return [
                        'id' => $branch->id,
                        'name' => $branch->name,
                        'code' => $branch->code,
                        'city' => $branch->city,
                        'latitude' => (float) $branch->latitude,
                        'longitude' => (float) $branch->longitude,
                        'allowed_radius_meters' => $branch->allowed_radius_meters,
                        'is_primary' => $branch->pivot->is_primary_branch ?? false,
                    ];
                })
                ->values()
                ->toArray();
        }

        // Users can mark attendance if they are assigned to required showrooms or Finance dept (admins are exempt)
        $canMarkAttendance = !$isAdmin && ($isAssignedToRequiredShowroom || $isFinanceDept);

        // Get primary branch (first one marked as primary, or first branch if none marked)
        $primaryBranch = null;
        if (count($assignedBranches) > 0) {
            $primaryBranch = collect($assignedBranches)->first(function ($branch) {
                return $branch['is_primary'] ?? false;
            }) ?? $assignedBranches[0] ?? null;
        }

        // For Finance department users without branch assignment, get department attendance settings
        $departmentAttendance = null;
        if ($isFinanceDept && !$primaryBranch) {
            $department = \App\Models\Department::where('name', 'Finance')->first();
            if ($department) {
                $deptSettings = \App\Models\DepartmentAttendanceSetting::where('department_id', $department->id)
                    ->where('is_active', true)
                    ->first();
                if ($deptSettings) {
                    $departmentAttendance = [
                        'department_id' => $department->id,
                        'department_name' => $department->name,
                        'location_name' => $deptSettings->location_name,
                        'address' => $deptSettings->address,
                        'city' => $deptSettings->city,
                        'latitude' => $deptSettings->latitude ? (float) $deptSettings->latitude : null,
                        'longitude' => $deptSettings->longitude ? (float) $deptSettings->longitude : null,
                        'allowed_radius_meters' => $deptSettings->allowed_radius_meters,
                        'gps_required' => $deptSettings->gps_required,
                        'work_start_time' => $deptSettings->work_start_time,
                        'work_end_time' => $deptSettings->work_end_time,
                        'late_grace_minutes' => $deptSettings->late_grace_minutes,
                        'has_location' => $deptSettings->hasLocationConfigured(),
                    ];
                    // Create a virtual branch for Finance department attendance
                    $primaryBranch = [
                        'id' => null, // No physical branch
                        'name' => $deptSettings->location_name ?: 'Finance Department',
                        'code' => 'FINANCE',
                        'city' => $deptSettings->city ?: 'Head Office',
                        'latitude' => $deptSettings->latitude ? (float) $deptSettings->latitude : null,
                        'longitude' => $deptSettings->longitude ? (float) $deptSettings->longitude : null,
                        'allowed_radius_meters' => $deptSettings->allowed_radius_meters,
                        'is_primary' => true,
                        'is_department_based' => true,
                        'department_id' => $department->id,
                        'gps_required' => $deptSettings->gps_required,
                    ];
                }
            }
        }

        // Get time settings from config or default
        $timeSettings = [
            'check_in_start' => config('attendance.check_in_start', '06:00'),
            'check_in_end' => config('attendance.check_in_end', '10:00'),
            'check_out_start' => config('attendance.check_out_start', '16:00'),
            'check_out_end' => config('attendance.check_out_end', '22:00'),
            'grace_period_minutes' => config('attendance.grace_period_minutes', 15),
        ];

        // Override time settings from department if available
        if ($departmentAttendance) {
            $timeSettings['check_in_start'] = substr($departmentAttendance['work_start_time'], 0, 5);
            $timeSettings['check_in_end'] = Carbon::parse($departmentAttendance['work_start_time'])->addHours(2)->format('H:i');
            $timeSettings['check_out_start'] = Carbon::parse($departmentAttendance['work_end_time'])->subHour()->format('H:i');
            $timeSettings['check_out_end'] = Carbon::parse($departmentAttendance['work_end_time'])->addHours(4)->format('H:i');
            $timeSettings['grace_period_minutes'] = $departmentAttendance['late_grace_minutes'];
        }

        // Check if GPS attendance is required for this user (admins are exempt)
        $isGpsRequired = !$isAdmin && ($isAssignedToRequiredShowroom || $isFinanceDept);
        $requiredShowrooms = $user->getRequiredShowrooms();

        return response()->json([
            'has_access' => true,
            'role' => $role,
            'attendance_role' => $role,
            'can_mark_attendance' => $canMarkAttendance,
            'is_admin_exempt' => $isAdmin, // Admin is exempt from GPS attendance
            'is_finance_department' => $isFinanceDept,
            'gps_attendance_required' => $isGpsRequired,
            'required_reason' => $isGpsRequired ? ($isFinanceDept ? 'finance_department' : 'required_showroom') : null,
            'required_showrooms' => $requiredShowrooms,
            'permissions' => [
                'can_manage_branches' => $isAdmin || $isAdminRole,
                'can_view_all_reports' => $isAdmin || $isAdminRole || $isFinanceRole || $isProcurement,
                'can_mark_attendance' => $canMarkAttendance,
                'can_approve_corrections' => $isAdmin || $isAdminRole,
                'can_export_data' => $isAdmin || $isAdminRole || $isFinanceRole || $isProcurement,
            ],
            'assigned_branches' => $assignedBranches,
            'primary_branch' => $primaryBranch,
            'department_attendance' => $departmentAttendance,
            'time_settings' => $timeSettings,
        ]);
    }

    /**
     * GPS Check-In
     */
    public function checkIn(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'device_info' => 'nullable|array',
            'gps_accuracy' => 'nullable|numeric',
            'is_department_based' => 'nullable|boolean',
            'department_id' => 'nullable|integer',
        ]);

        $user = $request->user();
        
        // Check if this is a department-based check-in (e.g., Finance department)
        $isDepartmentBased = $request->is_department_based ?? false;
        $isFinanceDept = $user->department_name && strtolower($user->department_name) === 'finance';

        // Verify user has branch_employee OR admin_procurement role with branch assignment
        // OR is a Finance department employee (department-based attendance)
        $canMarkAttendance = $user->isAttendanceBranchEmployee() || 
                             ($user->isAttendanceAdmin() && $user->activeBranches()->count() > 0) ||
                             $isFinanceDept;
        
        if (!$canMarkAttendance) {
            $message = $user->isAttendanceAdmin() 
                ? 'You need to be assigned to a branch to mark GPS attendance. Please assign yourself to a branch first.'
                : 'You do not have permission to mark GPS attendance.';
            
            return response()->json([
                'success' => false,
                'error_code' => 'UNAUTHORIZED',
                'message' => $message,
                'is_admin_without_branch' => $user->isAttendanceAdmin(),
            ], 403);
        }

        // Check if already checked in today
        $existingAttendance = $this->gpsService->getTodayAttendance($user);
        if ($existingAttendance && $existingAttendance->hasCheckedIn()) {
            return response()->json([
                'success' => false,
                'error_code' => 'ALREADY_CHECKED_IN',
                'message' => 'You have already checked in today.',
                'details' => [
                    'check_in_time' => $existingAttendance->in_time?->format('H:i'),
                    'branch_name' => $existingAttendance->branch?->name ?? 'Department Attendance',
                ],
            ], 400);
        }

        $latitude = (float) $request->latitude;
        $longitude = (float) $request->longitude;
        $gpsAccuracy = $request->gps_accuracy;
        $deviceInfo = $request->device_info ?? [];

        // Handle department-based check-in (Finance department without branch)
        if ($isFinanceDept && $user->activeBranches()->count() === 0) {
            $department = \App\Models\Department::where('name', 'Finance')->first();
            $deptSettings = null;
            if ($department) {
                $deptSettings = \App\Models\DepartmentAttendanceSetting::where('department_id', $department->id)
                    ->where('is_active', true)
                    ->first();
            }
            
            if (!$deptSettings) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'DEPARTMENT_NOT_CONFIGURED',
                    'message' => 'Your department is not configured for attendance. Please contact admin.',
                ], 400);
            }

            // Check if GPS validation is required for this department
            if ($deptSettings->gps_required && $deptSettings->hasLocationConfigured()) {
                // Validate GPS location against department location
                $distance = $this->gpsService->calculateDistance(
                    $latitude,
                    $longitude,
                    (float) $deptSettings->latitude,
                    (float) $deptSettings->longitude
                );

                $allowedRadius = $deptSettings->allowed_radius_meters ?? 100;
                
                if ($distance > $allowedRadius) {
                    // Log the failed attempt
                    $this->gpsService->logAudit(
                        AttendanceAuditLog::ACTION_CHECK_IN_FAILED,
                        $user,
                        null,
                        null,
                        [
                            'latitude' => $latitude,
                            'longitude' => $longitude,
                            'department_id' => $department->id,
                            'department_location' => $deptSettings->location_name,
                            'distance_meters' => $distance,
                            'allowed_radius' => $allowedRadius,
                            'failure_reason' => 'outside_department_radius',
                            'device_info' => $deviceInfo,
                            'ip_address' => $request->ip(),
                        ]
                    );

                    return response()->json([
                        'success' => false,
                        'error_code' => 'OUTSIDE_DEPARTMENT_LOCATION',
                        'message' => "You are {$distance}m away from {$deptSettings->location_name}. You must be within {$allowedRadius}m to check in.",
                        'details' => [
                            'distance_meters' => $distance,
                            'allowed_radius_meters' => $allowedRadius,
                            'department_location' => $deptSettings->location_name,
                            'department_address' => $deptSettings->address,
                        ],
                    ], 400);
                }
            } elseif ($deptSettings->gps_required && !$deptSettings->hasLocationConfigured()) {
                return response()->json([
                    'success' => false,
                    'error_code' => 'DEPARTMENT_LOCATION_NOT_SET',
                    'message' => 'Department location is not configured. Please contact admin to set up the department location.',
                ], 400);
            }

            // Create department-based attendance record with GPS validation
            $attendance = $this->gpsService->createDepartmentCheckIn(
                $user,
                $department->id,
                $latitude,
                $longitude,
                $gpsAccuracy,
                $deviceInfo,
                $request->ip(),
                $request->userAgent(),
                $deptSettings
            );

            if ($attendance) {
                return response()->json([
                    'success' => true,
                    'message' => 'Check-in successful!',
                    'data' => [
                        'attendance_id' => $attendance->id,
                        'check_in_time' => $attendance->in_time->format('H:i'),
                        'department' => $department->name,
                        'location' => $deptSettings->location_name,
                        'is_late' => $attendance->is_late,
                        'late_by_minutes' => $attendance->late_by_minutes ?? 0,
                        'is_department_based' => true,
                        'location_tracking' => [
                            'verified_at' => $deptSettings->location_name,
                            'distance_from_center' => $attendance->check_in_distance_meters,
                        ],
                    ],
                ]);
            }

            return response()->json([
                'success' => false,
                'error_code' => 'CHECK_IN_FAILED',
                'message' => 'Failed to record check-in. Please try again.',
            ], 500);
        }

        // Find valid branch for branch-based check-in
        $validationResult = $this->gpsService->findClosestValidBranch(
            $latitude,
            $longitude,
            $user,
            $gpsAccuracy
        );

        if (!$validationResult) {
            // Log the attempt
            $this->gpsService->logAudit(
                AttendanceAuditLog::ACTION_CHECK_IN_FAILED,
                $user,
                null,
                null,
                [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'failure_reason' => 'not_assigned',
                    'device_info' => $deviceInfo,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]
            );

            return response()->json([
                'success' => false,
                'error_code' => 'NOT_ASSIGNED',
                'message' => 'You are not assigned to any branch. Please contact your administrator.',
            ], 400);
        }

        // Check GPS validation
        if (!$validationResult['is_valid']) {
            $branch = Branch::find($validationResult['branch_id']);
            
            // Log failure
            $this->gpsService->logValidationFailure(
                $user,
                $branch,
                $validationResult,
                $deviceInfo,
                $request->ip(),
                $gpsAccuracy
            );

            $this->gpsService->logAudit(
                AttendanceAuditLog::ACTION_CHECK_IN_FAILED,
                $user,
                $branch,
                null,
                [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'distance_meters' => $validationResult['distance_meters'],
                    'failure_reason' => $validationResult['failure_reason'],
                    'device_info' => $deviceInfo,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]
            );

            $message = match ($validationResult['failure_reason']) {
                'outside_radius' => "You are {$validationResult['distance_meters']} meters from {$validationResult['branch_name']}. Please move within {$validationResult['allowed_radius_meters']} meters of the branch.",
                'gps_accuracy_low' => "Your GPS accuracy is too low ({$gpsAccuracy}m). Please move to an open area for better GPS signal.",
                default => 'Location validation failed. Please try again.',
            };

            return response()->json([
                'success' => false,
                'error_code' => strtoupper($validationResult['failure_reason'] ?? 'VALIDATION_FAILED'),
                'message' => $message,
                'details' => [
                    'distance_from_branch' => $validationResult['distance_meters'],
                    'allowed_radius' => $validationResult['allowed_radius_meters'],
                    'closest_branch' => $validationResult['branch_name'],
                ],
            ], 400);
        }

        $branch = Branch::find($validationResult['branch_id']);

        // Validate check-in time
        $timeValidation = $this->gpsService->validateCheckInTime($branch);

        if (!$timeValidation['can_check_in']) {
            $this->gpsService->logAudit(
                AttendanceAuditLog::ACTION_CHECK_IN_FAILED,
                $user,
                $branch,
                null,
                [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'distance_meters' => $validationResult['distance_meters'],
                    'failure_reason' => $timeValidation['failure_reason'],
                    'device_info' => $deviceInfo,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]
            );

            $message = $timeValidation['is_before_window']
                ? "Check-in is not available yet. Check-in window starts at {$timeValidation['check_in_window']['start']}."
                : "Check-in window has closed. Check-in was available until {$timeValidation['check_in_window']['end']}.";

            return response()->json([
                'success' => false,
                'error_code' => 'OUTSIDE_TIME',
                'message' => $message,
                'details' => [
                    'current_time' => now()->format('H:i'),
                    'check_in_window' => $timeValidation['check_in_window'],
                ],
            ], 400);
        }

        // Check for suspicious patterns
        $isSuspicious = $this->gpsService->checkSuspiciousPattern($user, $latitude, $longitude);

        // Create attendance record with enhanced location tracking
        DB::beginTransaction();
        try {
            $attendance = Attendance::create([
                'user_id' => $user->id,
                'branch_id' => $branch->id,
                'date' => now()->toDateString(),
                'emp_code' => $user->emp_code,
                'dept_name' => $user->department_name,
                'in_time' => now(),
                'attendance_method' => Attendance::METHOD_GPS_APP,
                'check_in_latitude' => $latitude,
                'check_in_longitude' => $longitude,
                'check_in_device_info' => $deviceInfo,
                'check_in_distance_meters' => $validationResult['distance_meters'],
                'gps_validated' => true,
                'validation_status' => Attendance::VALIDATION_VALID,
                'attendance_status' => $timeValidation['status'],
                'is_late' => $timeValidation['is_late'],
                'late_by_minutes' => $timeValidation['late_minutes'],
                'requires_approval' => $isSuspicious,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'source' => 'gps',
                // Enhanced location tracking fields
                'verified_branch_name' => $branch->name,
                'verified_branch_address' => $branch->address,
                'verified_branch_city' => $branch->city,
                'check_in_timestamp' => now(),
                'check_in_gps_accuracy' => $gpsAccuracy,
                'location_verified' => true,
                'at_assigned_location' => true,
                'location_verification_notes' => "Verified at {$branch->name} ({$validationResult['distance_meters']}m from branch center)",
            ]);

            // Log success
            $this->gpsService->logAudit(
                AttendanceAuditLog::ACTION_CHECK_IN_SUCCESS,
                $user,
                $branch,
                $attendance,
                [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'distance_meters' => $validationResult['distance_meters'],
                    'device_info' => $deviceInfo,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'validation_details' => [
                        'time_validation' => $timeValidation,
                        'location_validation' => $validationResult,
                    ],
                ]
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Check-in successful!',
                'attendance_id' => $attendance->id,
                'branch_name' => $branch->name,
                'check_in_time' => $attendance->in_time->format('H:i'),
                'status' => $attendance->attendance_status,
                'late_by_minutes' => $attendance->late_by_minutes,
                'working_hours_to_complete' => 8.0,
                // Enhanced tracking info
                'location_tracking' => [
                    'verified_at' => $branch->name,
                    'verified_address' => $branch->address,
                    'verified_city' => $branch->city,
                    'distance_from_center' => $validationResult['distance_meters'],
                    'allowed_radius' => $branch->allowed_radius_meters,
                    'gps_accuracy' => $gpsAccuracy,
                    'coordinates' => [
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                    ],
                    'timestamp' => now()->toIso8601String(),
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Check-in failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'error_code' => 'SYSTEM_ERROR',
                'message' => 'An error occurred while processing your check-in. Please try again.',
            ], 500);
        }
    }

    /**
     * GPS Check-Out
     */
    public function checkOut(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'device_info' => 'nullable|array',
            'gps_accuracy' => 'nullable|numeric',
        ]);

        $user = $request->user();

        // Verify user has branch_employee OR admin_procurement role with branch assignment
        $canMarkAttendance = $user->isAttendanceBranchEmployee() || 
                             ($user->isAttendanceAdmin() && $user->activeBranches()->count() > 0);
        
        if (!$canMarkAttendance) {
            $message = $user->isAttendanceAdmin() 
                ? 'You need to be assigned to a branch to mark GPS attendance.'
                : 'You do not have permission to mark GPS attendance.';
            
            return response()->json([
                'success' => false,
                'error_code' => 'UNAUTHORIZED',
                'message' => $message,
            ], 403);
        }

        // Get today's attendance
        $attendance = $this->gpsService->getTodayAttendance($user);

        if (!$attendance || !$attendance->hasCheckedIn()) {
            return response()->json([
                'success' => false,
                'error_code' => 'NOT_CHECKED_IN',
                'message' => 'You have not checked in today. Please check in first.',
            ], 400);
        }

        if ($attendance->hasCheckedOut()) {
            return response()->json([
                'success' => false,
                'error_code' => 'ALREADY_CHECKED_OUT',
                'message' => 'You have already checked out today.',
                'details' => [
                    'check_out_time' => $attendance->out_time?->format('H:i'),
                ],
            ], 400);
        }

        $latitude = (float) $request->latitude;
        $longitude = (float) $request->longitude;
        $gpsAccuracy = $request->gps_accuracy;
        $deviceInfo = $request->device_info ?? [];

        $branch = $attendance->branch;

        // Validate GPS location
        $validationResult = $this->gpsService->validateLocation($latitude, $longitude, $branch, $gpsAccuracy);

        if (!$validationResult['is_valid']) {
            $this->gpsService->logValidationFailure(
                $user,
                $branch,
                $validationResult,
                $deviceInfo,
                $request->ip(),
                $gpsAccuracy
            );

            $this->gpsService->logAudit(
                AttendanceAuditLog::ACTION_CHECK_OUT_FAILED,
                $user,
                $branch,
                $attendance,
                [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'distance_meters' => $validationResult['distance_meters'],
                    'failure_reason' => $validationResult['failure_reason'],
                    'device_info' => $deviceInfo,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]
            );

            $message = match ($validationResult['failure_reason']) {
                'outside_radius' => "You are {$validationResult['distance_meters']} meters from {$branch->name}. Please move within {$validationResult['allowed_radius_meters']} meters to check out.",
                'gps_accuracy_low' => "Your GPS accuracy is too low. Please move to an open area for better GPS signal.",
                default => 'Location validation failed. Please try again.',
            };

            return response()->json([
                'success' => false,
                'error_code' => strtoupper($validationResult['failure_reason'] ?? 'VALIDATION_FAILED'),
                'message' => $message,
                'details' => [
                    'distance_from_branch' => $validationResult['distance_meters'],
                    'allowed_radius' => $validationResult['allowed_radius_meters'],
                ],
            ], 400);
        }

        // Validate check-out time
        $timeValidation = $this->gpsService->validateCheckOutTime($branch, $attendance);

        DB::beginTransaction();
        try {
            $attendance->update([
                'out_time' => now(),
                'check_out_latitude' => $latitude,
                'check_out_longitude' => $longitude,
                'check_out_device_info' => $deviceInfo,
                'check_out_distance_meters' => $validationResult['distance_meters'],
                'working_hours' => $timeValidation['working_hours'],
                'is_early_leave' => $timeValidation['is_early_leave'],
                'early_by_minutes' => $timeValidation['early_minutes'],
                // Enhanced location tracking for check-out
                'check_out_timestamp' => now(),
                'check_out_gps_accuracy' => $gpsAccuracy,
                'location_verification_notes' => $attendance->location_verification_notes . 
                    " | Checkout verified at {$branch->name} ({$validationResult['distance_meters']}m from center)",
            ]);

            // Update status if early leave
            if ($timeValidation['is_early_leave'] && $attendance->attendance_status === 'present') {
                $attendance->update(['attendance_status' => Attendance::STATUS_EARLY_LEAVE]);
            }

            // Log success
            $this->gpsService->logAudit(
                AttendanceAuditLog::ACTION_CHECK_OUT_SUCCESS,
                $user,
                $branch,
                $attendance,
                [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'distance_meters' => $validationResult['distance_meters'],
                    'device_info' => $deviceInfo,
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'validation_details' => [
                        'time_validation' => $timeValidation,
                        'location_validation' => $validationResult,
                    ],
                ]
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Check-out successful!',
                'attendance_id' => $attendance->id,
                'check_out_time' => $attendance->out_time->format('H:i'),
                'total_working_hours' => $timeValidation['working_hours'],
                'is_early_leave' => $timeValidation['is_early_leave'],
                'early_by_minutes' => $timeValidation['early_minutes'],
                'status' => $attendance->attendance_status,
                // Enhanced tracking info
                'location_tracking' => [
                    'verified_at' => $branch->name,
                    'distance_from_center' => $validationResult['distance_meters'],
                    'allowed_radius' => $branch->allowed_radius_meters,
                    'gps_accuracy' => $gpsAccuracy,
                    'coordinates' => [
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                    ],
                    'timestamp' => now()->toIso8601String(),
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Check-out failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'error_code' => 'SYSTEM_ERROR',
                'message' => 'An error occurred while processing your check-out. Please try again.',
            ], 500);
        }
    }

    /**
     * Get today's attendance status
     */
    public function todayStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        // Allow access if user is a branch employee OR if GPS attendance is required for them
        // (Finance department or assigned to required showrooms)
        $isBranchEmployee = $user->isAttendanceBranchEmployee();
        $isGpsRequired = $user->isGpsAttendanceRequired();
        
        if (!$isBranchEmployee && !$isGpsRequired) {
            return response()->json([
                'success' => false,
                'message' => 'Not authorized for GPS attendance',
            ], 403);
        }

        $attendance = $this->gpsService->getTodayAttendance($user);
        $primaryBranch = $user->primaryBranch();

        // Get time settings
        $timeSettings = null;
        $checkInWindow = ['start' => '08:00', 'end' => '09:30'];
        $checkOutWindow = ['start' => '17:00', 'end' => '19:00'];

        if ($primaryBranch) {
            $settings = $primaryBranch->getEffectiveTimeSettings();
            if ($settings) {
                $checkInWindow = $settings->check_in_window;
                $checkOutWindow = $settings->check_out_window;
            }
        }

        // Determine if can check in/out
        $now = now();
        $canCheckIn = false;
        $canCheckOut = false;

        if (!$attendance || !$attendance->hasCheckedIn()) {
            // Check if within check-in window
            $checkInStart = Carbon::parse($checkInWindow['start']);
            $checkInEnd = Carbon::parse($checkInWindow['end'])->addMinutes(30); // Allow 30 min grace
            $canCheckIn = $now->between($checkInStart, $checkInEnd);
        } elseif ($attendance->hasCheckedIn() && !$attendance->hasCheckedOut()) {
            $canCheckOut = true;
        }

        return response()->json([
            'date' => now()->toDateString(),
            'has_checked_in' => $attendance?->hasCheckedIn() ?? false,
            'check_in_time' => $attendance?->in_time?->format('H:i'),
            'check_in_branch' => $attendance?->branch?->name,
            'has_checked_out' => $attendance?->hasCheckedOut() ?? false,
            'check_out_time' => $attendance?->out_time?->format('H:i'),
            'status' => $attendance?->attendance_status,
            'working_hours' => $attendance?->working_hours,
            'is_late' => $attendance?->is_late ?? false,
            'late_by_minutes' => $attendance?->late_by_minutes ?? 0,
            'can_check_in' => $canCheckIn,
            'can_check_out' => $canCheckOut,
            'check_in_time_window' => $checkInWindow,
            'check_out_time_window' => $checkOutWindow,
            // Enhanced location tracking info
            'attendance' => $attendance ? [
                'id' => $attendance->id,
                'has_checked_in' => $attendance->hasCheckedIn(),
                'has_checked_out' => $attendance->hasCheckedOut(),
                'check_in_time' => $attendance->in_time?->format('H:i'),
                'check_out_time' => $attendance->out_time?->format('H:i'),
                'attendance_status' => $attendance->attendance_status,
                'location_tracking' => [
                    'verified_branch' => $attendance->verified_branch_name,
                    'verified_address' => $attendance->verified_branch_address,
                    'verified_city' => $attendance->verified_branch_city,
                    'check_in' => [
                        'latitude' => $attendance->check_in_latitude,
                        'longitude' => $attendance->check_in_longitude,
                        'distance_meters' => $attendance->check_in_distance_meters,
                        'gps_accuracy' => $attendance->check_in_gps_accuracy,
                        'timestamp' => $attendance->check_in_timestamp?->toIso8601String(),
                    ],
                    'check_out' => $attendance->hasCheckedOut() ? [
                        'latitude' => $attendance->check_out_latitude,
                        'longitude' => $attendance->check_out_longitude,
                        'distance_meters' => $attendance->check_out_distance_meters,
                        'gps_accuracy' => $attendance->check_out_gps_accuracy,
                        'timestamp' => $attendance->check_out_timestamp?->toIso8601String(),
                    ] : null,
                    'location_verified' => $attendance->location_verified,
                    'at_assigned_location' => $attendance->at_assigned_location,
                    'verification_notes' => $attendance->location_verification_notes,
                ],
            ] : null,
        ]);
    }

    /**
     * Validate current location before check-in/out
     */
    public function validateLocation(Request $request): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $user = $request->user();

        if (!$user->isAttendanceBranchEmployee()) {
            return response()->json([
                'is_valid' => false,
                'message' => 'Not a branch employee',
            ], 403);
        }

        $latitude = (float) $request->latitude;
        $longitude = (float) $request->longitude;

        $validationResult = $this->gpsService->findClosestValidBranch($latitude, $longitude, $user);

        if (!$validationResult) {
            return response()->json([
                'is_valid' => false,
                'branch_id' => null,
                'branch_name' => null,
                'distance_meters' => null,
                'within_radius' => false,
                'allowed_radius' => null,
                'message' => 'You are not assigned to any branch.',
            ]);
        }

        return response()->json([
            'is_valid' => $validationResult['is_valid'],
            'branch_id' => $validationResult['branch_id'],
            'branch_name' => $validationResult['branch_name'],
            'distance_meters' => $validationResult['distance_meters'],
            'within_radius' => $validationResult['within_radius'],
            'allowed_radius' => $validationResult['allowed_radius_meters'],
            'message' => $validationResult['is_valid']
                ? "You are within {$validationResult['branch_name']} area."
                : "You are {$validationResult['distance_meters']}m from {$validationResult['branch_name']}. Move within {$validationResult['allowed_radius_meters']}m to mark attendance.",
        ]);
    }

    /**
     * Get personal attendance history
     */
    public function myHistory(Request $request): JsonResponse
    {
        $user = $request->user();

        // Allow branch employees OR Finance department users
        $isBranchEmployee = $user->isAttendanceBranchEmployee();
        $isGpsRequired = $user->isGpsAttendanceRequired();
        
        if (!$isBranchEmployee && !$isGpsRequired) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $dateFrom = $request->input('date_from', now()->subDays(30)->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());
        $status = $request->input('status', 'all');
        $branchId = $request->input('branch_id');
        $perPage = $request->input('per_page', 30);

        $query = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->with(['branch:id,name,code', 'department:id,name'])
            ->orderBy('date', 'desc');

        if ($status !== 'all') {
            $query->where('attendance_status', $status);
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $attendances = $query->paginate($perPage);

        // Calculate summary
        $summaryQuery = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$dateFrom, $dateTo]);

        $totalDays = $summaryQuery->count();
        $presentDays = (clone $summaryQuery)->whereIn('attendance_status', ['present', 'late', 'early_leave'])->count();
        $lateDays = (clone $summaryQuery)->where('is_late', true)->count();
        $absentDays = (clone $summaryQuery)->where('attendance_status', 'absent')->count();
        $avgWorkingHours = (clone $summaryQuery)->whereNotNull('working_hours')->avg('working_hours') ?? 0;

        return response()->json([
            'data' => $attendances->items(),
            'pagination' => [
                'current_page' => $attendances->currentPage(),
                'total_pages' => $attendances->lastPage(),
                'total_records' => $attendances->total(),
                'per_page' => $attendances->perPage(),
            ],
            'summary' => [
                'total_days' => $totalDays,
                'present_days' => $presentDays,
                'late_days' => $lateDays,
                'absent_days' => $absentDays,
                'attendance_percentage' => $totalDays > 0 ? round(($presentDays / $totalDays) * 100, 1) : 0,
                'average_working_hours' => round($avgWorkingHours, 2),
            ],
        ]);
    }

    /**
     * Get personal attendance statistics
     */
    public function myStatistics(Request $request): JsonResponse
    {
        $user = $request->user();

        // Allow branch employees OR Finance department users
        $isBranchEmployee = $user->isAttendanceBranchEmployee();
        $isGpsRequired = $user->isGpsAttendanceRequired();
        
        if (!$isBranchEmployee && !$isGpsRequired) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $month = $request->input('month', now()->month);
        $year = $request->input('year', now()->year);

        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth();

        $query = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$startDate, $endDate]);

        $attendances = $query->get();

        $presentDays = $attendances->whereIn('attendance_status', ['present', 'late', 'early_leave'])->count();
        $lateDays = $attendances->where('is_late', true)->count();
        $absentDays = $attendances->where('attendance_status', 'absent')->count();
        $halfDays = $attendances->where('attendance_status', 'half_day')->count();
        $earlyLeaves = $attendances->where('is_early_leave', true)->count();
        $onTimeArrivals = $attendances->where('is_late', false)->whereIn('attendance_status', ['present', 'early_leave'])->count();
        $totalWorkingHours = $attendances->sum('working_hours') ?? 0;
        $avgWorkingHours = $attendances->whereNotNull('working_hours')->avg('working_hours') ?? 0;

        // Calculate working days in month (excluding weekends)
        $totalWorkingDays = 0;
        $current = $startDate->copy();
        while ($current->lte($endDate) && $current->lte(now())) {
            if (!$current->isWeekend()) {
                $totalWorkingDays++;
            }
            $current->addDay();
        }

        return response()->json([
            'month' => (int) $month,
            'year' => (int) $year,
            'total_working_days' => $totalWorkingDays,
            'present_days' => $presentDays,
            'late_days' => $lateDays,
            'absent_days' => $absentDays,
            'half_days' => $halfDays,
            'attendance_percentage' => $totalWorkingDays > 0 ? round(($presentDays / $totalWorkingDays) * 100, 1) : 0,
            'punctuality_percentage' => $presentDays > 0 ? round(($onTimeArrivals / $presentDays) * 100, 1) : 0,
            'total_working_hours' => round($totalWorkingHours, 2),
            'average_working_hours' => round($avgWorkingHours, 2),
            'on_time_arrivals' => $onTimeArrivals,
            'late_arrivals' => $lateDays,
            'normal_departures' => $presentDays - $earlyLeaves,
            'early_departures' => $earlyLeaves,
        ]);
    }

    /**
     * Request attendance correction
     */
    public function requestCorrection(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'attendance_id' => 'required|exists:attendances,id',
            'correction_type' => 'required|in:check_in_time,check_out_time,both,add_missing',
            'requested_check_in' => 'nullable|date_format:H:i',
            'requested_check_out' => 'nullable|date_format:H:i',
            'reason' => 'required|string|max:500',
        ]);

        // Verify the attendance belongs to this user
        $attendance = \App\Models\Attendance::where('id', $validated['attendance_id'])
            ->where('user_id', $user->id)
            ->first();

        if (!$attendance) {
            return response()->json([
                'error' => 'Attendance record not found or does not belong to you',
            ], 404);
        }

        // Check if there's already a pending correction for this attendance
        $existingCorrection = \App\Models\AttendanceCorrection::where('attendance_id', $attendance->id)
            ->where('status', 'pending')
            ->first();

        if ($existingCorrection) {
            return response()->json([
                'error' => 'A pending correction request already exists for this attendance record',
            ], 400);
        }

        $correction = \App\Models\AttendanceCorrection::create([
            'attendance_id' => $attendance->id,
            'user_id' => $user->id,
            'correction_type' => $validated['correction_type'],
            'original_check_in' => $attendance->in_time,
            'original_check_out' => $attendance->out_time,
            'requested_check_in' => $validated['requested_check_in'] ?? null,
            'requested_check_out' => $validated['requested_check_out'] ?? null,
            'reason' => $validated['reason'],
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Correction request submitted successfully',
            'correction' => $correction,
        ], 201);
    }

    /**
     * Get user's correction requests
     */
    public function getMyCorrections(Request $request): JsonResponse
    {
        $user = $request->user();

        $corrections = \App\Models\AttendanceCorrection::where('user_id', $user->id)
            ->with(['attendance:id,date,in_time,out_time', 'reviewedBy:id,name'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($corrections);
    }

    /**
     * Withdraw a pending correction request
     */
    public function withdrawCorrection(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        $correction = \App\Models\AttendanceCorrection::where('id', $id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if (!$correction) {
            return response()->json([
                'error' => 'Correction request not found or cannot be withdrawn',
            ], 404);
        }

        $correction->delete();

        return response()->json([
            'message' => 'Correction request withdrawn successfully',
        ]);
    }

    /**
     * Admin self-assignment to a branch
     * Allows admin/procurement users to assign themselves to a branch for GPS attendance
     */
    public function assignMeToBranch(Request $request): JsonResponse
    {
        $user = $request->user();

        // Only admin/procurement can use this endpoint
        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json([
                'error' => 'Only admin/procurement users can use this feature.',
            ], 403);
        }

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'is_primary_branch' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        $branch = Branch::where('id', $validated['branch_id'])
            ->where('is_active', true)
            ->first();

        if (!$branch) {
            return response()->json([
                'error' => 'Branch not found or is inactive.',
            ], 404);
        }

        // Check if already assigned to this branch
        $existingAssignment = \App\Models\UserBranchAssignment::where('user_id', $user->id)
            ->where('branch_id', $validated['branch_id'])
            ->where('status', 'active')
            ->first();

        if ($existingAssignment) {
            return response()->json([
                'error' => 'You are already assigned to this branch.',
                'branch' => $branch,
            ], 400);
        }

        // If setting as primary, unset other primary branches
        if ($validated['is_primary_branch'] ?? false) {
            \App\Models\UserBranchAssignment::where('user_id', $user->id)
                ->where('status', 'active')
                ->update(['is_primary_branch' => false]);
        }

        // Create assignment
        $assignment = \App\Models\UserBranchAssignment::create([
            'user_id' => $user->id,
            'branch_id' => $validated['branch_id'],
            'is_primary_branch' => $validated['is_primary_branch'] ?? ($user->activeBranches()->count() === 0),
            'assigned_by' => $user->id, // Self-assignment
            'assigned_at' => now(),
            'effective_from' => now()->toDateString(),
            'status' => 'active',
            'notes' => $validated['notes'] ?? 'Admin self-assignment for GPS attendance',
        ]);

        // Log the self-assignment in audit
        $this->gpsService->logAudit(
            'admin_self_assignment',
            $user,
            $branch,
            null,
            [
                'action' => 'self_assigned_to_branch',
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'is_primary' => $assignment->is_primary_branch,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]
        );

        return response()->json([
            'message' => "You have been assigned to {$branch->name}. You can now mark GPS attendance at this branch.",
            'assignment' => [
                'branch_id' => $branch->id,
                'branch_name' => $branch->name,
                'is_primary_branch' => $assignment->is_primary_branch,
                'assigned_at' => $assignment->assigned_at,
            ],
            'branch' => [
                'id' => $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
                'city' => $branch->city,
                'latitude' => (float) $branch->latitude,
                'longitude' => (float) $branch->longitude,
                'allowed_radius_meters' => $branch->allowed_radius_meters,
            ],
        ], 201);
    }

    /**
     * Get available branches for admin self-assignment
     */
    public function getAvailableBranches(Request $request): JsonResponse
    {
        $user = $request->user();

        // Only admin/procurement can use this endpoint
        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json([
                'error' => 'Only admin/procurement users can use this feature.',
            ], 403);
        }

        // Get all active branches
        $branches = Branch::where('is_active', true)
            ->select('id', 'name', 'code', 'city', 'district', 'latitude', 'longitude', 'allowed_radius_meters', 'address')
            ->orderBy('name')
            ->get();

        // Get user's current assignments
        $userAssignments = $user->activeBranches()->pluck('branches.id')->toArray();

        // Mark which branches user is already assigned to
        $branches->each(function ($branch) use ($userAssignments, $user) {
            $branch->is_assigned = in_array($branch->id, $userAssignments);
            
            // Get assignment details if assigned
            if ($branch->is_assigned) {
                $assignment = $user->branchAssignments()
                    ->where('branch_id', $branch->id)
                    ->where('status', 'active')
                    ->first();
                $branch->is_primary = $assignment?->is_primary_branch ?? false;
            } else {
                $branch->is_primary = false;
            }
        });

        return response()->json([
            'branches' => $branches,
            'user_assignments' => $userAssignments,
            'total_assigned' => count($userAssignments),
        ]);
    }

    /**
     * Get live attendance status for all employees (Admin only)
     */
    public function getLiveAttendance(Request $request): JsonResponse
    {
        $user = $request->user();

        // Only admin can access this
        if (!$user->isAdmin() && !$user->isAttendanceAdmin()) {
            return response()->json([
                'error' => 'Unauthorized. Only administrators can access live attendance.',
            ], 403);
        }

        $today = Carbon::today()->toDateString();
        $branchId = $request->get('branch_id');

        // Get today's attendance records
        $query = Attendance::with(['user:id,name,email,employee_id', 'branch:id,name,code,city'])
            ->whereDate('date', $today);

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $attendance = $query->orderBy('check_in_timestamp', 'desc')->get();

        // Map to a cleaner format
        $records = $attendance->map(function ($record) {
            return [
                'id' => $record->id,
                'user' => [
                    'id' => $record->user->id ?? null,
                    'name' => $record->user->name ?? 'Unknown',
                    'employee_id' => $record->user->employee_id ?? null,
                ],
                'branch' => [
                    'id' => $record->branch->id ?? null,
                    'name' => $record->branch->name ?? 'Unknown',
                ],
                'branch_id' => $record->branch_id,
                'check_in_time' => $record->in_time ? Carbon::parse($record->in_time)->format('H:i:s') : null,
                'check_out_time' => $record->out_time ? Carbon::parse($record->out_time)->format('H:i:s') : null,
                'status' => $record->out_time ? 'checked_out' : 'checked_in',
                'location_verified' => $record->gps_validated ?? false,
                'is_late' => $record->is_late ?? false,
                'check_in_location' => $record->check_in_address,
                'check_out_location' => $record->check_out_address,
            ];
        });

        return response()->json([
            'attendance' => $records,
            'date' => $today,
            'total' => $records->count(),
            'checked_in' => $records->where('status', 'checked_in')->count(),
            'checked_out' => $records->where('status', 'checked_out')->count(),
        ]);
    }

    /**
     * Get attendance audit logs (Admin only)
     */
    public function getAuditLogs(Request $request): JsonResponse
    {
        $user = $request->user();

        // Only admin can access this
        if (!$user->isAdmin() && !$user->isAttendanceAdmin()) {
            return response()->json([
                'error' => 'Unauthorized. Only administrators can access audit logs.',
            ], 403);
        }

        $limit = min($request->get('limit', 50), 200);
        $branchId = $request->get('branch_id');
        $userId = $request->get('user_id');
        $action = $request->get('action');

        $query = AttendanceAuditLog::with(['user:id,name,email', 'branch:id,name'])
            ->orderBy('created_at', 'desc');

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($action) {
            $query->where('action', $action);
        }

        $logs = $query->limit($limit)->get();

        // Map to cleaner format
        $formattedLogs = $logs->map(function ($log) {
            return [
                'id' => $log->id,
                'action' => $log->action,
                'description' => $this->formatAuditDescription($log),
                'user' => [
                    'id' => $log->user->id ?? null,
                    'name' => $log->user->name ?? 'System',
                ],
                'branch' => $log->branch ? [
                    'id' => $log->branch->id,
                    'name' => $log->branch->name,
                ] : null,
                'metadata' => $log->metadata,
                'created_at' => $log->created_at->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json([
            'logs' => $formattedLogs,
            'total' => $formattedLogs->count(),
        ]);
    }

    /**
     * Format audit log description
     */
    private function formatAuditDescription($log): string
    {
        $userName = $log->user->name ?? 'Unknown user';
        $branchName = $log->branch->name ?? 'Unknown branch';

        switch ($log->action) {
            case 'check_in':
                return "{$userName} checked in at {$branchName}";
            case 'check_out':
                return "{$userName} checked out at {$branchName}";
            case 'correction_submitted':
                return "{$userName} submitted a correction request";
            case 'correction_approved':
                return "Correction request for {$userName} was approved";
            case 'correction_rejected':
                return "Correction request for {$userName} was rejected";
            case 'admin_self_assignment':
                return "{$userName} self-assigned to {$branchName}";
            case 'branch_assignment_removed':
                return "{$userName} removed assignment from {$branchName}";
            default:
                return $log->action . ' - ' . ($log->description ?? '');
        }
    }

    /**
     * Get all departments configured for attendance tracking
     */
    public function getAttendanceDepartments(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $departments = DepartmentAttendanceSetting::with(['department:id,name', 'creator:id,name'])
            ->where('is_active', true)
            ->get()
            ->map(function ($setting) {
                return [
                    'id' => $setting->id,
                    'department_id' => $setting->department_id,
                    'department' => $setting->department,
                    'name' => $setting->department?->name,
                    'work_start_time' => $setting->work_start_time?->format('H:i'),
                    'work_end_time' => $setting->work_end_time?->format('H:i'),
                    'late_grace_minutes' => $setting->late_grace_minutes,
                    'employee_count' => User::where('department_id', $setting->department_id)->count(),
                    'created_by' => $setting->creator?->name,
                    'created_at' => $setting->created_at,
                ];
            });

        return response()->json([
            'departments' => $departments,
            'total' => $departments->count(),
        ]);
    }

    /**
     * Add a department for attendance tracking
     */
    public function addAttendanceDepartment(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'department_id' => 'required|exists:departments,id|unique:department_attendance_settings,department_id',
            'work_start_time' => 'nullable|date_format:H:i',
            'work_end_time' => 'nullable|date_format:H:i',
            'late_grace_minutes' => 'nullable|integer|min:0|max:60',
        ]);

        $setting = DepartmentAttendanceSetting::create([
            'department_id' => $validated['department_id'],
            'work_start_time' => $validated['work_start_time'] ?? '09:00',
            'work_end_time' => $validated['work_end_time'] ?? '18:00',
            'late_grace_minutes' => $validated['late_grace_minutes'] ?? 15,
            'created_by' => $user->id,
        ]);

        $setting->load('department:id,name');

        return response()->json([
            'message' => 'Department added to attendance tracking',
            'department' => [
                'id' => $setting->id,
                'department_id' => $setting->department_id,
                'department' => $setting->department,
                'work_start_time' => $setting->work_start_time?->format('H:i'),
                'work_end_time' => $setting->work_end_time?->format('H:i'),
                'late_grace_minutes' => $setting->late_grace_minutes,
            ],
        ], 201);
    }

    /**
     * Update department attendance settings
     */
    public function updateAttendanceDepartment(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $setting = DepartmentAttendanceSetting::findOrFail($id);

        $validated = $request->validate([
            'work_start_time' => 'nullable|date_format:H:i',
            'work_end_time' => 'nullable|date_format:H:i',
            'late_grace_minutes' => 'nullable|integer|min:0|max:60',
        ]);

        if (isset($validated['work_start_time'])) {
            $setting->work_start_time = $validated['work_start_time'];
        }
        if (isset($validated['work_end_time'])) {
            $setting->work_end_time = $validated['work_end_time'];
        }
        if (isset($validated['late_grace_minutes'])) {
            $setting->late_grace_minutes = $validated['late_grace_minutes'];
        }

        $setting->save();
        $setting->load('department:id,name');

        return response()->json([
            'message' => 'Department attendance settings updated',
            'department' => [
                'id' => $setting->id,
                'department_id' => $setting->department_id,
                'department' => $setting->department,
                'work_start_time' => $setting->work_start_time?->format('H:i'),
                'work_end_time' => $setting->work_end_time?->format('H:i'),
                'late_grace_minutes' => $setting->late_grace_minutes,
            ],
        ]);
    }

    /**
     * Remove department from attendance tracking
     */
    public function removeAttendanceDepartment(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->isAttendanceAdmin() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $setting = DepartmentAttendanceSetting::findOrFail($id);
        $departmentName = $setting->department?->name ?? 'Unknown';
        
        $setting->delete();

        return response()->json([
            'message' => "Department '{$departmentName}' removed from attendance tracking",
        ]);
    }
}
