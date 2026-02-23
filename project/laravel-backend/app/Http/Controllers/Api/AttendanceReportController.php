<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;
use OpenSpout\Writer\XLSX\Writer;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Options;

class AttendanceReportController extends Controller
{
    /**
     * Get daily attendance report
     */
    public function dailyReport(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->canViewAttendanceReports()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'date' => 'nullable|date',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $date = $validated['date'] ?? now()->toDateString();

        $query = Attendance::with([
            'user:id,name,username,email,emp_code,department_id',
            'user.departmentRelation:id,name',
            'branch:id,name,code',
        ])
            ->whereDate('date', $date)
            ->where('attendance_method', Attendance::METHOD_GPS_APP);

        if (isset($validated['branch_id'])) {
            $query->where('branch_id', $validated['branch_id']);
        }

        $attendances = $query->get();

        // Get all branch employees for the selected branch(es)
        $branchEmployeesQuery = DB::table('user_branch_assignments')
            ->join('users', 'users.id', '=', 'user_branch_assignments.user_id')
            ->where('user_branch_assignments.status', 'active')
            ->where('user_branch_assignments.is_primary_branch', true)
            ->select('users.id', 'users.name', 'users.username', 'users.emp_code', 'user_branch_assignments.branch_id');

        if (isset($validated['branch_id'])) {
            $branchEmployeesQuery->where('user_branch_assignments.branch_id', $validated['branch_id']);
        }

        $branchEmployees = $branchEmployeesQuery->get();

        // Find absent employees
        $presentUserIds = $attendances->pluck('user_id')->toArray();
        $absentEmployees = $branchEmployees->filter(fn($e) => !in_array($e->id, $presentUserIds));

        // Summary statistics
        $summary = [
            'date' => $date,
            'total_employees' => $branchEmployees->count(),
            'total_present' => $attendances->whereIn('attendance_status', ['present', 'late', 'early_leave'])->count(),
            'total_late' => $attendances->where('is_late', true)->count(),
            'total_absent' => $absentEmployees->count(),
            'total_early_leave' => $attendances->where('attendance_status', 'early_leave')->count(),
            'checked_in_only' => $attendances->filter(fn($a) => $a->hasCheckedIn() && !$a->hasCheckedOut())->count(),
            'attendance_rate' => $branchEmployees->count() > 0
                ? round(($attendances->count() / $branchEmployees->count()) * 100, 1)
                : 0,
            'punctuality_rate' => $attendances->count() > 0
                ? round((($attendances->count() - $attendances->where('is_late', true)->count()) / $attendances->count()) * 100, 1)
                : 100,
        ];

        // Branch breakdown if no specific branch selected
        $branchBreakdown = [];
        if (!isset($validated['branch_id'])) {
            $branches = Branch::where('is_active', true)->get();
            foreach ($branches as $branch) {
                $branchAttendances = $attendances->where('branch_id', $branch->id);
                $branchEmployeeCount = $branchEmployees->where('branch_id', $branch->id)->count();

                $branchBreakdown[] = [
                    'branch_id' => $branch->id,
                    'branch_name' => $branch->name,
                    'branch_code' => $branch->code,
                    'total_employees' => $branchEmployeeCount,
                    'present' => $branchAttendances->count(),
                    'late' => $branchAttendances->where('is_late', true)->count(),
                    'absent' => $branchEmployeeCount - $branchAttendances->count(),
                    'attendance_rate' => $branchEmployeeCount > 0
                        ? round(($branchAttendances->count() / $branchEmployeeCount) * 100, 1)
                        : 0,
                ];
            }
        }

        return response()->json([
            'summary' => $summary,
            'branch_breakdown' => $branchBreakdown,
            'attendances' => $attendances->map(function ($attendance) {
                return [
                    'id' => $attendance->id,
                    'date' => $attendance->date->format('Y-m-d'),
                    'user' => [
                        'id' => $attendance->user->id,
                        'name' => $attendance->user->name,
                        'username' => $attendance->user->username,
                        'emp_code' => $attendance->user->emp_code,
                        'department' => $attendance->user->departmentRelation?->name,
                    ],
                    'branch' => [
                        'id' => $attendance->branch->id,
                        'name' => $attendance->branch->name,
                        'code' => $attendance->branch->code,
                    ],
                    'check_in' => [
                        'time' => $attendance->in_time?->format('H:i:s'),
                        'latitude' => $attendance->check_in_latitude,
                        'longitude' => $attendance->check_in_longitude,
                        'distance_meters' => $attendance->check_in_distance_meters,
                    ],
                    'check_out' => [
                        'time' => $attendance->out_time?->format('H:i:s'),
                        'latitude' => $attendance->check_out_latitude,
                        'longitude' => $attendance->check_out_longitude,
                        'distance_meters' => $attendance->check_out_distance_meters,
                    ],
                    'status' => $attendance->attendance_status,
                    'is_late' => $attendance->is_late,
                    'late_minutes' => $attendance->late_minutes,
                    'working_hours' => $attendance->working_hours,
                    'validation_status' => $attendance->gps_validation_status ?? $attendance->validation_status,
                ];
            }),
            'absent_employees' => $absentEmployees->map(function ($employee) {
                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'username' => $employee->username,
                    'emp_code' => $employee->emp_code,
                ];
            })->values(),
        ]);
    }

    /**
     * Get monthly attendance report
     */
    public function monthlyReport(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->canViewAttendanceReports()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'month' => 'nullable|integer|between:1,12',
            'year' => 'nullable|integer|min:2020|max:2100',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $month = $validated['month'] ?? now()->month;
        $year = $validated['year'] ?? now()->year;

        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        $workingDays = $this->getWorkingDaysInMonth($startDate, $endDate);

        $query = Attendance::with([
            'user:id,name,username,emp_code,department_id',
            'user.departmentRelation:id,name',
            'branch:id,name,code',
        ])
            ->whereBetween('date', [$startDate, $endDate])
            ->where('attendance_method', Attendance::METHOD_GPS_APP);

        if (isset($validated['branch_id'])) {
            $query->where('branch_id', $validated['branch_id']);
        }

        $attendances = $query->get();

        // Group by user
        $userStats = $attendances->groupBy('user_id')->map(function ($userAttendances, $userId) use ($workingDays) {
            $user = $userAttendances->first()->user;

            return [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'emp_code' => $user->emp_code,
                    'department' => $user->departmentRelation?->name,
                ],
                'total_days' => $userAttendances->count(),
                'present_days' => $userAttendances->whereIn('attendance_status', ['present', 'late', 'early_leave'])->count(),
                'late_days' => $userAttendances->where('is_late', true)->count(),
                'early_leave_days' => $userAttendances->where('attendance_status', 'early_leave')->count(),
                'absent_days' => $workingDays - $userAttendances->count(),
                'total_working_hours' => round($userAttendances->sum('working_hours'), 2),
                'average_working_hours' => round($userAttendances->whereNotNull('working_hours')->avg('working_hours'), 2),
                'total_late_minutes' => $userAttendances->sum('late_minutes'),
                'attendance_rate' => $workingDays > 0
                    ? round(($userAttendances->count() / $workingDays) * 100, 1)
                    : 0,
                'punctuality_rate' => $userAttendances->count() > 0
                    ? round((($userAttendances->count() - $userAttendances->where('is_late', true)->count()) / $userAttendances->count()) * 100, 1)
                    : 100,
            ];
        })->values();

        // Overall summary
        $summary = [
            'month' => $month,
            'year' => $year,
            'period' => $startDate->format('F Y'),
            'working_days' => $workingDays,
            'total_employees' => $userStats->count(),
            'total_attendance_records' => $attendances->count(),
            'average_attendance_rate' => round($userStats->avg('attendance_rate'), 1),
            'average_punctuality_rate' => round($userStats->avg('punctuality_rate'), 1),
            'total_late_entries' => $attendances->where('is_late', true)->count(),
            'total_early_leaves' => $attendances->where('attendance_status', 'early_leave')->count(),
            'total_working_hours' => round($attendances->sum('working_hours'), 2),
            'average_working_hours_per_day' => round($attendances->whereNotNull('working_hours')->avg('working_hours'), 2),
        ];

        return response()->json([
            'summary' => $summary,
            'employee_stats' => $userStats,
        ]);
    }

    /**
     * Get employee attendance report
     */
    public function employeeReport(Request $request, $userId): JsonResponse
    {
        $user = $request->user();

        if (!$user->canViewAttendanceReports()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $employee = User::with('departmentRelation:id,name', 'branchAssignments.branch:id,name,code')
            ->findOrFail($userId);

        $dateFrom = $validated['date_from'] ?? now()->startOfMonth()->toDateString();
        $dateTo = $validated['date_to'] ?? now()->toDateString();

        $attendances = Attendance::with('branch:id,name,code')
            ->where('user_id', $userId)
            ->where('attendance_method', Attendance::METHOD_GPS_APP)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->orderBy('date', 'desc')
            ->get();

        $workingDays = $this->getWorkingDaysInRange(Carbon::parse($dateFrom), Carbon::parse($dateTo));

        // Summary
        $summary = [
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'working_days' => $workingDays,
            'total_present' => $attendances->whereIn('attendance_status', ['present', 'late', 'early_leave'])->count(),
            'total_absent' => max(0, $workingDays - $attendances->count()),
            'total_late' => $attendances->where('is_late', true)->count(),
            'total_early_leaves' => $attendances->where('attendance_status', 'early_leave')->count(),
            'total_working_hours' => round($attendances->sum('working_hours'), 2),
            'average_working_hours' => round($attendances->whereNotNull('working_hours')->avg('working_hours'), 2),
            'total_late_minutes' => $attendances->sum('late_minutes'),
            'attendance_rate' => $workingDays > 0
                ? round(($attendances->count() / $workingDays) * 100, 1)
                : 0,
            'punctuality_rate' => $attendances->count() > 0
                ? round((($attendances->count() - $attendances->where('is_late', true)->count()) / $attendances->count()) * 100, 1)
                : 100,
        ];

        return response()->json([
            'employee' => [
                'id' => $employee->id,
                'name' => $employee->name,
                'username' => $employee->username,
                'email' => $employee->email,
                'emp_code' => $employee->emp_code,
                'department' => $employee->departmentRelation?->name,
                'primary_branch' => $employee->primaryBranch()?->only(['id', 'name', 'code']),
            ],
            'summary' => $summary,
            'attendances' => $attendances->map(function ($attendance) {
                return [
                    'id' => $attendance->id,
                    'date' => $attendance->date->format('Y-m-d'),
                    'day' => $attendance->date->format('l'),
                    'branch' => [
                        'id' => $attendance->branch->id,
                        'name' => $attendance->branch->name,
                        'code' => $attendance->branch->code,
                    ],
                    'check_in_time' => $attendance->in_time?->format('H:i:s'),
                    'check_out_time' => $attendance->out_time?->format('H:i:s'),
                    'working_hours' => $attendance->working_hours,
                    'status' => $attendance->attendance_status,
                    'is_late' => $attendance->is_late,
                    'late_minutes' => $attendance->late_minutes,
                ];
            }),
        ]);
    }

    /**
     * Export attendance report as CSV
     */
    public function exportCsv(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $user = $request->user();

        if (!$user->canViewAttendanceReports()) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'type' => 'required|in:daily,monthly,employee',
            'date' => 'nullable|date',
            'month' => 'nullable|integer|between:1,12',
            'year' => 'nullable|integer|min:2020|max:2100',
            'user_id' => 'nullable|exists:users,id',
            'branch_id' => 'nullable|exists:branches,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'include_locations' => 'nullable|in:0,1,true,false',
        ]);

        $type = $validated['type'];
        $includeLocations = in_array($validated['include_locations'] ?? '0', ['1', 'true'], true);

        $filename = "attendance_report_{$type}_" . now()->format('Y-m-d_His') . ".csv";

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        return response()->stream(function () use ($type, $validated, $includeLocations) {
            $handle = fopen('php://output', 'w');

            // BOM for UTF-8
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            if ($type === 'daily') {
                $this->exportDailyCsv($handle, $validated, $includeLocations);
            } elseif ($type === 'monthly') {
                $this->exportMonthlyCsv($handle, $validated, $includeLocations);
            } elseif ($type === 'employee') {
                $this->exportEmployeeCsv($handle, $validated);
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Export daily attendance CSV
     * Format: Date, EmpCode, FP Code, NameDept, Name, In, Out (+ locations if requested)
     */
    private function exportDailyCsv($handle, array $params, bool $includeLocations = false): void
    {
        $date = $params['date'] ?? now()->toDateString();

        $query = Attendance::with([
            'user:id,name,username,emp_code,department_id',
            'user.departmentRelation:id,name',
            'branch:id,name,code',
        ])
            ->whereDate('date', $date)
            ->where('attendance_method', Attendance::METHOD_GPS_APP)
            ->orderBy('branch_id')
            ->orderBy('user_id');

        if (isset($params['branch_id'])) {
            $query->where('branch_id', $params['branch_id']);
        }

        $attendances = $query->get();

        // Header row - Requested format: Date, EmpCode, FP Code, NameDept, Name, In, Out (+ locations)
        $headers = [
            'Date',
            'EmpCode',
            'FP Code',
            'NameDept',
            'Name',
            'Branch',
            'In',
        ];
        
        if ($includeLocations) {
            $headers[] = 'Check-In Latitude';
            $headers[] = 'Check-In Longitude';
            $headers[] = 'Check-In Distance (m)';
        }
        
        $headers[] = 'Out';
        
        if ($includeLocations) {
            $headers[] = 'Check-Out Latitude';
            $headers[] = 'Check-Out Longitude';
            $headers[] = 'Check-Out Distance (m)';
        }
        
        fputcsv($handle, $headers);

        // Data rows
        foreach ($attendances as $attendance) {
            $row = [
                $attendance->date->format('Y-m-d'),
                $attendance->emp_code ?? $attendance->user->emp_code ?? $attendance->user_id,
                $attendance->fp_code ?? '',
                $attendance->dept_name ?? $attendance->user->departmentRelation?->name ?? '',
                $attendance->user->name ?? '',
                $attendance->branch->name ?? '',
                $attendance->in_time?->format('H:i') ?? '',
            ];
            
            if ($includeLocations) {
                $row[] = $attendance->check_in_latitude ?? '';
                $row[] = $attendance->check_in_longitude ?? '';
                $row[] = $attendance->check_in_distance_meters ?? '';
            }
            
            $row[] = $attendance->out_time?->format('H:i') ?? '';
            
            if ($includeLocations) {
                $row[] = $attendance->check_out_latitude ?? '';
                $row[] = $attendance->check_out_longitude ?? '';
                $row[] = $attendance->check_out_distance_meters ?? '';
            }
            
            fputcsv($handle, $row);
        }
    }

    /**
     * Export monthly attendance CSV
     * Format: Date, EmpCode, FP Code, NameDept, Name, In, Out [+ Location columns if requested]
     */
    private function exportMonthlyCsv($handle, array $params, bool $includeLocations = false): void
    {
        $month = $params['month'] ?? now()->month;
        $year = $params['year'] ?? now()->year;

        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $query = Attendance::with([
            'user:id,name,username,emp_code,department_id',
            'user.departmentRelation:id,name',
        ])
            ->whereBetween('date', [$startDate, $endDate])
            ->where('attendance_method', Attendance::METHOD_GPS_APP)
            ->orderBy('date')
            ->orderBy('user_id');

        if (isset($params['branch_id'])) {
            $query->where('branch_id', $params['branch_id']);
        }

        $attendances = $query->get();

        // Header row
        $headers = [
            'Date',
            'EmpCode',
            'FP Code',
            'NameDept',
            'Name',
            'In',
        ];
        
        if ($includeLocations) {
            $headers[] = 'Check In Lat';
            $headers[] = 'Check In Lng';
            $headers[] = 'Check In Distance (m)';
        }
        
        $headers[] = 'Out';
        
        if ($includeLocations) {
            $headers[] = 'Check Out Lat';
            $headers[] = 'Check Out Lng';
            $headers[] = 'Check Out Distance (m)';
        }
        
        fputcsv($handle, $headers);

        // Data rows
        foreach ($attendances as $attendance) {
            $row = [
                $attendance->date->format('Y-m-d'),
                $attendance->emp_code ?? $attendance->user->emp_code ?? $attendance->user_id,
                $attendance->fp_code ?? '',
                $attendance->dept_name ?? $attendance->user->departmentRelation?->name ?? '',
                $attendance->user->name ?? '',
                $attendance->in_time?->format('H:i') ?? '',
            ];
            
            if ($includeLocations) {
                $row[] = $attendance->check_in_latitude ?? '';
                $row[] = $attendance->check_in_longitude ?? '';
                $row[] = $attendance->check_in_distance_meters ?? '';
            }
            
            $row[] = $attendance->out_time?->format('H:i') ?? '';
            
            if ($includeLocations) {
                $row[] = $attendance->check_out_latitude ?? '';
                $row[] = $attendance->check_out_longitude ?? '';
                $row[] = $attendance->check_out_distance_meters ?? '';
            }
            
            fputcsv($handle, $row);
        }
    }

    /**
     * Export employee attendance CSV
     */
    private function exportEmployeeCsv($handle, array $params): void
    {
        $userId = $params['user_id'];
        $dateFrom = $params['date_from'] ?? now()->startOfMonth()->toDateString();
        $dateTo = $params['date_to'] ?? now()->toDateString();

        $employee = User::findOrFail($userId);

        $attendances = Attendance::with('branch:id,name,code')
            ->where('user_id', $userId)
            ->where('attendance_method', Attendance::METHOD_GPS_APP)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->orderBy('date', 'asc')
            ->get();

        // Header row
        fputcsv($handle, [
            'Employee: ' . $employee->name . ' (' . ($employee->emp_code ?? $employee->username) . ')',
            'Period: ' . $dateFrom . ' to ' . $dateTo,
        ]);

        fputcsv($handle, []); // Empty row

        fputcsv($handle, [
            'Date',
            'Day',
            'Branch',
            'Check-in Time',
            'Check-out Time',
            'Working Hours',
            'Status',
            'Late',
            'Late Minutes',
        ]);

        // Data rows
        foreach ($attendances as $attendance) {
            fputcsv($handle, [
                $attendance->date->format('Y-m-d'),
                $attendance->date->format('l'),
                $attendance->branch->name,
                $attendance->in_time?->format('H:i:s') ?? '-',
                $attendance->out_time?->format('H:i:s') ?? '-',
                $attendance->working_hours ?? '-',
                ucfirst($attendance->attendance_status ?? '-'),
                $attendance->is_late ? 'Yes' : 'No',
                $attendance->late_minutes ?? 0,
            ]);
        }
    }

    /**
     * Get GPS validation failure statistics
     */
    public function gpsValidationStats(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->canManageAttendance()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $dateFrom = $validated['date_from'] ?? now()->subDays(30)->toDateString();
        $dateTo = $validated['date_to'] ?? now()->toDateString();

        $query = DB::table('gps_validation_failures')
            ->join('users', 'users.id', '=', 'gps_validation_failures.user_id')
            ->join('branches', 'branches.id', '=', 'gps_validation_failures.branch_id')
            ->whereBetween('gps_validation_failures.attempt_time', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59']);

        if (isset($validated['branch_id'])) {
            $query->where('gps_validation_failures.branch_id', $validated['branch_id']);
        }

        // By failure reason
        $byReason = $query->clone()
            ->select('failure_reason', DB::raw('COUNT(*) as count'))
            ->groupBy('failure_reason')
            ->get();

        // By branch
        $byBranch = $query->clone()
            ->select('branches.name as branch_name', DB::raw('COUNT(*) as count'))
            ->groupBy('branches.id', 'branches.name')
            ->orderByDesc('count')
            ->get();

        // By user (top offenders)
        $byUser = $query->clone()
            ->select('users.name as user_name', 'users.username', DB::raw('COUNT(*) as count'))
            ->groupBy('users.id', 'users.name', 'users.username')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        // Recent failures
        $recentFailures = DB::table('gps_validation_failures')
            ->join('users', 'users.id', '=', 'gps_validation_failures.user_id')
            ->join('branches', 'branches.id', '=', 'gps_validation_failures.branch_id')
            ->whereBetween('gps_validation_failures.attempt_time', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])
            ->when(isset($validated['branch_id']), fn($q) => $q->where('gps_validation_failures.branch_id', $validated['branch_id']))
            ->select(
                'gps_validation_failures.*',
                'users.name as user_name',
                'users.username',
                'branches.name as branch_name'
            )
            ->orderByDesc('attempt_time')
            ->limit(50)
            ->get();

        return response()->json([
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'total_failures' => $byReason->sum('count'),
            'by_reason' => $byReason,
            'by_branch' => $byBranch,
            'top_users' => $byUser,
            'recent_failures' => $recentFailures,
        ]);
    }

    /**
     * Get audit log report
     */
    public function auditReport(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->canManageAttendance()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'user_id' => 'nullable|exists:users,id',
            'action' => 'nullable|string',
        ]);

        $dateFrom = $validated['date_from'] ?? now()->subDays(7)->toDateString();
        $dateTo = $validated['date_to'] ?? now()->toDateString();

        $query = DB::table('attendance_audit_logs')
            ->join('users', 'users.id', '=', 'attendance_audit_logs.user_id')
            ->leftJoin('branches', 'branches.id', '=', 'attendance_audit_logs.branch_id')
            ->whereBetween('attendance_audit_logs.created_at', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])
            ->select(
                'attendance_audit_logs.*',
                'users.name as user_name',
                'users.username',
                'branches.name as branch_name'
            );

        if (isset($validated['user_id'])) {
            $query->where('attendance_audit_logs.user_id', $validated['user_id']);
        }

        if (isset($validated['action'])) {
            $query->where('attendance_audit_logs.action', $validated['action']);
        }

        $logs = $query->orderByDesc('created_at')
            ->paginate($request->input('per_page', 50));

        return response()->json($logs);
    }

    /**
     * Helper: Get working days in a month (excluding weekends)
     */
    private function getWorkingDaysInMonth(Carbon $startDate, Carbon $endDate): int
    {
        return $this->getWorkingDaysInRange($startDate, $endDate);
    }

    /**
     * Helper: Get working days in a date range (excluding weekends)
     */
    private function getWorkingDaysInRange(Carbon $startDate, Carbon $endDate): int
    {
        $workingDays = 0;
        $current = $startDate->copy();

        while ($current <= $endDate) {
            if (!$current->isWeekend()) {
                $workingDays++;
            }
            $current->addDay();
        }

        return $workingDays;
    }

    /**
     * Export attendance report as Excel (XLSX)
     */
    public function exportExcel(Request $request)
    {
        $user = $request->user();

        if (!$user->canViewAttendanceReports()) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'type' => 'required|in:daily,monthly,employee',
            'date' => 'nullable|date',
            'month' => 'nullable|integer|between:1,12',
            'year' => 'nullable|integer|min:2020|max:2100',
            'user_id' => 'nullable|exists:users,id',
            'branch_id' => 'nullable|exists:branches,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'include_locations' => 'nullable|in:0,1,true,false',
        ]);

        $type = $validated['type'];
        $includeLocations = in_array($validated['include_locations'] ?? '0', ['1', 'true'], true);
        
        // Get data based on report type
        $data = $this->getReportData($validated, $includeLocations);
        
        $filename = "attendance_report_{$type}_" . now()->format('Y-m-d_His') . ".xlsx";
        $tempFile = tempnam(sys_get_temp_dir(), 'excel_');
        
        $options = new Options();
        $writer = new Writer($options);
        $writer->openToFile($tempFile);
        
        // Write header row
        $writer->addRow(Row::fromValues($data['headers']));
        
        // Write data rows
        foreach ($data['rows'] as $row) {
            $writer->addRow(Row::fromValues($row));
        }
        
        $writer->close();
        
        return response()->download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Export attendance report as PDF
     */
    public function exportPdf(Request $request)
    {
        $user = $request->user();

        if (!$user->canViewAttendanceReports()) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'type' => 'required|in:daily,monthly,employee',
            'date' => 'nullable|date',
            'month' => 'nullable|integer|between:1,12',
            'year' => 'nullable|integer|min:2020|max:2100',
            'user_id' => 'nullable|exists:users,id',
            'branch_id' => 'nullable|exists:branches,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'include_locations' => 'nullable|in:0,1,true,false',
        ]);

        $type = $validated['type'];
        $includeLocations = in_array($validated['include_locations'] ?? '0', ['1', 'true'], true);
        
        // Get data based on report type
        $data = $this->getReportData($validated, $includeLocations);
        
        // Determine report title
        $title = 'Attendance Report';
        if ($type === 'daily') {
            $date = $validated['date'] ?? now()->toDateString();
            $title = 'Daily Attendance Report - ' . Carbon::parse($date)->format('F j, Y');
        } elseif ($type === 'monthly') {
            $month = $validated['month'] ?? now()->month;
            $year = $validated['year'] ?? now()->year;
            $title = 'Monthly Attendance Report - ' . Carbon::create($year, $month, 1)->format('F Y');
        }
        
        $pdf = Pdf::loadView('reports.attendance-pdf', [
            'title' => $title,
            'headers' => $data['headers'],
            'rows' => $data['rows'],
            'generatedAt' => now()->format('F j, Y g:i A'),
            'includeLocations' => $includeLocations,
        ])->setPaper('a4', 'landscape');
        
        $filename = "attendance_report_{$type}_" . now()->format('Y-m-d_His') . ".pdf";
        
        return $pdf->download($filename);
    }

    /**
     * Get report data for Excel/PDF export
     */
    private function getReportData(array $params, bool $includeLocations = false): array
    {
        $type = $params['type'];
        
        if ($type === 'daily') {
            return $this->getDailyReportData($params, $includeLocations);
        } elseif ($type === 'monthly') {
            return $this->getMonthlyReportData($params, $includeLocations);
        }
        
        return ['headers' => [], 'rows' => []];
    }

    /**
     * Get daily report data for export
     */
    private function getDailyReportData(array $params, bool $includeLocations = false): array
    {
        $date = $params['date'] ?? now()->toDateString();

        $query = Attendance::with([
            'user:id,name,username,emp_code,department_id',
            'user.departmentRelation:id,name',
            'branch:id,name,code',
        ])
            ->whereDate('date', $date)
            ->where('attendance_method', Attendance::METHOD_GPS_APP)
            ->orderBy('branch_id')
            ->orderBy('user_id');

        if (isset($params['branch_id'])) {
            $query->where('branch_id', $params['branch_id']);
        }

        $attendances = $query->get();

        // Build headers
        $headers = ['Date', 'EmpCode', 'FP Code', 'Department', 'Name', 'Branch', 'In'];
        
        if ($includeLocations) {
            $headers = array_merge($headers, ['Check-In Lat', 'Check-In Lng', 'Distance (m)']);
        }
        
        $headers[] = 'Out';
        
        if ($includeLocations) {
            $headers = array_merge($headers, ['Check-Out Lat', 'Check-Out Lng', 'Distance (m)']);
        }

        // Build rows
        $rows = [];
        foreach ($attendances as $attendance) {
            $row = [
                $attendance->date->format('Y-m-d'),
                $attendance->emp_code ?? $attendance->user->emp_code ?? $attendance->user_id,
                $attendance->fp_code ?? '',
                $attendance->dept_name ?? $attendance->user->departmentRelation?->name ?? '',
                $attendance->user->name ?? '',
                $attendance->branch->name ?? '',
                $attendance->in_time?->format('H:i') ?? '',
            ];
            
            if ($includeLocations) {
                $row[] = $attendance->check_in_latitude ?? '';
                $row[] = $attendance->check_in_longitude ?? '';
                $row[] = $attendance->check_in_distance_meters ?? '';
            }
            
            $row[] = $attendance->out_time?->format('H:i') ?? '';
            
            if ($includeLocations) {
                $row[] = $attendance->check_out_latitude ?? '';
                $row[] = $attendance->check_out_longitude ?? '';
                $row[] = $attendance->check_out_distance_meters ?? '';
            }
            
            $rows[] = $row;
        }

        return ['headers' => $headers, 'rows' => $rows];
    }

    /**
     * Get monthly report data for export
     */
    private function getMonthlyReportData(array $params, bool $includeLocations = false): array
    {
        $month = $params['month'] ?? now()->month;
        $year = $params['year'] ?? now()->year;

        $startDate = Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();

        $query = Attendance::with([
            'user:id,name,username,emp_code,department_id',
            'user.departmentRelation:id,name',
        ])
            ->whereBetween('date', [$startDate, $endDate])
            ->where('attendance_method', Attendance::METHOD_GPS_APP)
            ->orderBy('date')
            ->orderBy('user_id');

        if (isset($params['branch_id'])) {
            $query->where('branch_id', $params['branch_id']);
        }

        $attendances = $query->get();

        // Build headers
        $headers = ['Date', 'EmpCode', 'FP Code', 'Department', 'Name', 'In'];
        
        if ($includeLocations) {
            $headers = array_merge($headers, ['Check-In Lat', 'Check-In Lng', 'Distance (m)']);
        }
        
        $headers[] = 'Out';
        
        if ($includeLocations) {
            $headers = array_merge($headers, ['Check-Out Lat', 'Check-Out Lng', 'Distance (m)']);
        }

        // Build rows
        $rows = [];
        foreach ($attendances as $attendance) {
            $row = [
                $attendance->date->format('Y-m-d'),
                $attendance->emp_code ?? $attendance->user->emp_code ?? $attendance->user_id,
                $attendance->fp_code ?? '',
                $attendance->dept_name ?? $attendance->user->departmentRelation?->name ?? '',
                $attendance->user->name ?? '',
                $attendance->in_time?->format('H:i') ?? '',
            ];
            
            if ($includeLocations) {
                $row[] = $attendance->check_in_latitude ?? '';
                $row[] = $attendance->check_in_longitude ?? '';
                $row[] = $attendance->check_in_distance_meters ?? '';
            }
            
            $row[] = $attendance->out_time?->format('H:i') ?? '';
            
            if ($includeLocations) {
                $row[] = $attendance->check_out_latitude ?? '';
                $row[] = $attendance->check_out_longitude ?? '';
                $row[] = $attendance->check_out_distance_meters ?? '';
            }
            
            $rows[] = $row;
        }

        return ['headers' => $headers, 'rows' => $rows];
    }
}
