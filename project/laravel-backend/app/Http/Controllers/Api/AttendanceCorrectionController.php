<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceAuditLog;
use App\Models\AttendanceCorrection;
use App\Notifications\AttendanceCorrectionNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceCorrectionController extends Controller
{
    /**
     * List all pending corrections (Admin)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->canManageAttendance()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = AttendanceCorrection::with([
            'user:id,name,username,emp_code,department_id',
            'user.departmentRelation:id,name',
            'attendance:id,date,branch_id,in_time,out_time,attendance_status',
            'attendance.branch:id,name,code',
        ]);

        // Filter by status
        $status = $request->input('status', 'pending');
        if ($status !== 'all') {
            $query->where('status', $status);
        }

        // Filter by branch
        if ($request->filled('branch_id')) {
            $query->whereHas('attendance', function ($q) use ($request) {
                $q->where('branch_id', $request->branch_id);
            });
        }

        // Filter by user
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', $request->date_from . ' 00:00:00');
        }
        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        // Filter by correction type
        if ($request->filled('correction_type')) {
            $query->where('correction_type', $request->correction_type);
        }

        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');

        $corrections = $query->orderBy($sortBy, $sortDir)
            ->paginate($request->input('per_page', 20));

        return response()->json($corrections);
    }

    /**
     * Get single correction details (Admin)
     */
    public function show(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->canManageAttendance()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $correction = AttendanceCorrection::with([
            'user:id,name,username,email,emp_code,department_id',
            'user.departmentRelation:id,name',
            'user.branchAssignments.branch:id,name,code',
            'attendance',
            'attendance.branch:id,name,code',
            'reviewedBy:id,name,username',
        ])->findOrFail($id);

        // Get related audit logs
        $auditLogs = AttendanceAuditLog::where('attendance_id', $correction->attendance_id)
            ->orderBy('created_at', 'desc')
            ->get();

        // Get other corrections for same user (recent)
        $relatedCorrections = AttendanceCorrection::where('user_id', $correction->user_id)
            ->where('id', '!=', $id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'correction' => $correction,
            'audit_logs' => $auditLogs,
            'related_corrections' => $relatedCorrections,
        ]);
    }

    /**
     * Approve a correction request (Admin)
     */
    public function approve(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->canManageAttendance()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $correction = AttendanceCorrection::with('attendance', 'user')
            ->where('status', AttendanceCorrection::STATUS_PENDING)
            ->findOrFail($id);

        $validated = $request->validate([
            'review_notes' => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($correction, $user, $validated) {
            // Update correction status
            $correction->update([
                'status' => AttendanceCorrection::STATUS_APPROVED,
                'reviewed_by' => $user->id,
                'reviewed_at' => now(),
                'review_notes' => $validated['review_notes'] ?? null,
            ]);

            // Apply the correction to attendance
            $attendance = $correction->attendance;

            if ($correction->correction_type === 'check_in_time' && $correction->requested_check_in) {
                $attendance->update([
                    'in_time' => $correction->requested_check_in,
                    'gps_validation_status' => 'admin_approved',
                    'approved_by' => $user->id,
                    'approved_at' => now(),
                ]);
            }

            if ($correction->correction_type === 'check_out_time' && $correction->requested_check_out) {
                $attendance->update([
                    'out_time' => $correction->requested_check_out,
                    'gps_validation_status' => 'admin_approved',
                    'approved_by' => $user->id,
                    'approved_at' => now(),
                ]);
            }

            if ($correction->correction_type === 'both') {
                $updates = [];
                if ($correction->requested_check_in) {
                    $updates['in_time'] = $correction->requested_check_in;
                }
                if ($correction->requested_check_out) {
                    $updates['out_time'] = $correction->requested_check_out;
                }
                $updates['gps_validation_status'] = 'admin_approved';
                $updates['approved_by'] = $user->id;
                $updates['approved_at'] = now();

                $attendance->update($updates);
            }

            // Recalculate working hours if both times exist
            if ($attendance->fresh()->in_time && $attendance->fresh()->out_time) {
                $workingHours = $attendance->fresh()->in_time->diffInMinutes($attendance->fresh()->out_time) / 60;
                $attendance->update(['working_hours' => round($workingHours, 2)]);
            }

            // Log audit
            AttendanceAuditLog::create([
                'user_id' => $correction->user_id,
                'attendance_id' => $correction->attendance_id,
                'branch_id' => $correction->attendance->branch_id,
                'action' => 'correction_approved',
                'action_by' => $user->id,
                'old_value' => json_encode([
                    'original_check_in' => $correction->original_check_in,
                    'original_check_out' => $correction->original_check_out,
                ]),
                'new_value' => json_encode([
                    'requested_check_in' => $correction->requested_check_in,
                    'requested_check_out' => $correction->requested_check_out,
                ]),
                'description' => "Correction request #{$correction->id} approved by {$user->name}",
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            // Notify employee
            try {
                $correction->user->notify(new AttendanceCorrectionNotification($correction, 'approved'));
            } catch (\Exception $e) {
                // Silent fail for notification
            }
        });

        return response()->json([
            'message' => 'Correction request approved successfully',
            'correction' => $correction->fresh()->load(['user:id,name,username', 'attendance', 'reviewedBy:id,name']),
        ]);
    }

    /**
     * Reject a correction request (Admin)
     */
    public function reject(Request $request, $id): JsonResponse
    {
        $user = $request->user();

        if (!$user->canManageAttendance()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $correction = AttendanceCorrection::with('attendance', 'user')
            ->where('status', AttendanceCorrection::STATUS_PENDING)
            ->findOrFail($id);

        $validated = $request->validate([
            'review_notes' => 'required|string|max:500',
        ]);

        DB::transaction(function () use ($correction, $user, $validated) {
            // Update correction status
            $correction->update([
                'status' => AttendanceCorrection::STATUS_REJECTED,
                'reviewed_by' => $user->id,
                'reviewed_at' => now(),
                'review_notes' => $validated['review_notes'],
            ]);

            // Log audit
            AttendanceAuditLog::create([
                'user_id' => $correction->user_id,
                'attendance_id' => $correction->attendance_id,
                'branch_id' => $correction->attendance->branch_id,
                'action' => 'correction_rejected',
                'action_by' => $user->id,
                'old_value' => json_encode([
                    'requested_check_in' => $correction->requested_check_in,
                    'requested_check_out' => $correction->requested_check_out,
                ]),
                'new_value' => null,
                'description' => "Correction request #{$correction->id} rejected: {$validated['review_notes']}",
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            // Notify employee
            try {
                $correction->user->notify(new AttendanceCorrectionNotification($correction, 'rejected'));
            } catch (\Exception $e) {
                // Silent fail for notification
            }
        });

        return response()->json([
            'message' => 'Correction request rejected',
            'correction' => $correction->fresh()->load(['user:id,name,username', 'reviewedBy:id,name']),
        ]);
    }

    /**
     * Bulk approve/reject corrections (Admin)
     */
    public function bulkAction(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->canManageAttendance()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'correction_ids' => 'required|array|min:1',
            'correction_ids.*' => 'exists:attendance_corrections,id',
            'action' => 'required|in:approve,reject',
            'review_notes' => 'nullable|string|max:500',
        ]);

        $action = $validated['action'];
        $corrections = AttendanceCorrection::whereIn('id', $validated['correction_ids'])
            ->where('status', AttendanceCorrection::STATUS_PENDING)
            ->get();

        if ($corrections->isEmpty()) {
            return response()->json([
                'message' => 'No pending corrections found with the provided IDs.',
            ], 400);
        }

        $processed = 0;
        $failed = 0;

        foreach ($corrections as $correction) {
            try {
                if ($action === 'approve') {
                    // Simulate approve request
                    $request->merge(['review_notes' => $validated['review_notes']]);
                    DB::transaction(function () use ($correction, $user, $validated) {
                        $correction->update([
                            'status' => AttendanceCorrection::STATUS_APPROVED,
                            'reviewed_by' => $user->id,
                            'reviewed_at' => now(),
                            'review_notes' => $validated['review_notes'] ?? 'Bulk approved',
                        ]);

                        // Apply correction
                        $attendance = $correction->attendance;
                        $updates = ['gps_validation_status' => 'admin_approved', 'approved_by' => $user->id, 'approved_at' => now()];

                        if ($correction->requested_check_in) {
                            $updates['in_time'] = $correction->requested_check_in;
                        }
                        if ($correction->requested_check_out) {
                            $updates['out_time'] = $correction->requested_check_out;
                        }

                        $attendance->update($updates);

                        // Log audit
                        AttendanceAuditLog::create([
                            'user_id' => $correction->user_id,
                            'attendance_id' => $correction->attendance_id,
                            'branch_id' => $correction->attendance->branch_id,
                            'action' => 'correction_approved',
                            'action_by' => $user->id,
                            'description' => "Bulk approved correction #{$correction->id}",
                            'ip_address' => request()->ip(),
                            'user_agent' => request()->userAgent(),
                        ]);
                    });
                } else {
                    DB::transaction(function () use ($correction, $user, $validated) {
                        $correction->update([
                            'status' => AttendanceCorrection::STATUS_REJECTED,
                            'reviewed_by' => $user->id,
                            'reviewed_at' => now(),
                            'review_notes' => $validated['review_notes'] ?? 'Bulk rejected',
                        ]);

                        // Log audit
                        AttendanceAuditLog::create([
                            'user_id' => $correction->user_id,
                            'attendance_id' => $correction->attendance_id,
                            'branch_id' => $correction->attendance->branch_id,
                            'action' => 'correction_rejected',
                            'action_by' => $user->id,
                            'description' => "Bulk rejected correction #{$correction->id}",
                            'ip_address' => request()->ip(),
                            'user_agent' => request()->userAgent(),
                        ]);
                    });
                }

                $processed++;
            } catch (\Exception $e) {
                $failed++;
            }
        }

        return response()->json([
            'message' => "Bulk {$action} completed",
            'processed' => $processed,
            'failed' => $failed,
        ]);
    }

    /**
     * Get correction statistics (Admin)
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->canManageAttendance()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $dateFrom = $validated['date_from'] ?? now()->startOfMonth()->toDateString();
        $dateTo = $validated['date_to'] ?? now()->toDateString();

        $baseQuery = AttendanceCorrection::whereBetween('created_at', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59']);

        // By status
        $byStatus = $baseQuery->clone()
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        // By correction type
        $byType = $baseQuery->clone()
            ->select('correction_type', DB::raw('COUNT(*) as count'))
            ->groupBy('correction_type')
            ->get()
            ->pluck('count', 'correction_type');

        // Average processing time (approved/rejected)
        $avgProcessingTime = DB::table('attendance_corrections')
            ->whereBetween('created_at', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])
            ->whereIn('status', [AttendanceCorrection::STATUS_APPROVED, AttendanceCorrection::STATUS_REJECTED])
            ->whereNotNull('reviewed_at')
            ->select(DB::raw('AVG(TIMESTAMPDIFF(HOUR, created_at, reviewed_at)) as avg_hours'))
            ->first();

        // Pending count
        $pendingCount = AttendanceCorrection::where('status', AttendanceCorrection::STATUS_PENDING)->count();

        // Top requesters
        $topRequesters = $baseQuery->clone()
            ->join('users', 'users.id', '=', 'attendance_corrections.user_id')
            ->select('users.name', 'users.username', DB::raw('COUNT(*) as count'))
            ->groupBy('users.id', 'users.name', 'users.username')
            ->orderByDesc('count')
            ->limit(10)
            ->get();

        return response()->json([
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'summary' => [
                'total' => $byStatus->sum(),
                'pending' => $byStatus[AttendanceCorrection::STATUS_PENDING] ?? 0,
                'approved' => $byStatus[AttendanceCorrection::STATUS_APPROVED] ?? 0,
                'rejected' => $byStatus[AttendanceCorrection::STATUS_REJECTED] ?? 0,
                'withdrawn' => $byStatus[AttendanceCorrection::STATUS_WITHDRAWN] ?? 0,
                'approval_rate' => ($byStatus[AttendanceCorrection::STATUS_APPROVED] ?? 0) + ($byStatus[AttendanceCorrection::STATUS_REJECTED] ?? 0) > 0
                    ? round((($byStatus[AttendanceCorrection::STATUS_APPROVED] ?? 0) / (($byStatus[AttendanceCorrection::STATUS_APPROVED] ?? 0) + ($byStatus[AttendanceCorrection::STATUS_REJECTED] ?? 0))) * 100, 1)
                    : 0,
                'avg_processing_hours' => round($avgProcessingTime->avg_hours ?? 0, 1),
                'pending_queue' => $pendingCount,
            ],
            'by_type' => $byType,
            'top_requesters' => $topRequesters,
        ]);
    }
}
