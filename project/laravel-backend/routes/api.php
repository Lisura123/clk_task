<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\TimeEntryController;
use App\Http\Controllers\Api\TaskLinkController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\GroupPlanController;
use App\Http\Controllers\Api\GroupMessageController;
use App\Http\Controllers\Api\DailyWorkLogController;
use App\Http\Controllers\Api\ScheduledPlanController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\PlanDailyEntryController;
use App\Http\Controllers\Api\WebPushController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\GpsAttendanceController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\AttendanceReportController;
use App\Http\Controllers\Api\AttendanceCorrectionController;
use App\Http\Controllers\Api\AttendanceRequestController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:login');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:login');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:login');
Route::get('/departments/public/list', [DepartmentController::class, 'publicList']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/change-password', [AuthController::class, 'changePassword']);
    Route::put('/notification-preferences', [AuthController::class, 'updateNotificationPreferences']);

    // Department routes
    Route::get('/departments', [DepartmentController::class, 'index']);
    Route::get('/departments/{id}', [DepartmentController::class, 'show']);
    Route::get('/departments/{id}/statistics', [DepartmentController::class, 'statistics']);
    Route::get('/departments/{id}/employees', [DepartmentController::class, 'employees']);
    Route::post('/departments', [DepartmentController::class, 'store']); // Super admin only
    Route::put('/departments/{id}', [DepartmentController::class, 'update']); // Super admin only
    Route::delete('/departments/{id}', [DepartmentController::class, 'destroy']); // Super admin only

    // User routes
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/basic', [UserController::class, 'basicList']);
    Route::get('/users/{id}', [UserController::class, 'show']); // Get single user details
    Route::post('/users', [UserController::class, 'store']); // Admin only
    Route::put('/users/{id}', [UserController::class, 'update']); // Admin only
    Route::delete('/users/{id}', [UserController::class, 'destroy']); // Admin only
    Route::get('/users/{id}/statistics', [UserController::class, 'statistics']);
    
    // Pending registrations
    Route::get('/users/pending/registrations', [UserController::class, 'pendingRegistrations']);
    Route::post('/users/{id}/approve', [UserController::class, 'approve']);
    Route::post('/users/{id}/reject', [UserController::class, 'reject']);
    
    // Onboarding routes
    Route::post('/users/onboarding-complete', [UserController::class, 'markOnboardingComplete']);
    Route::post('/users/onboarding-reset', [UserController::class, 'resetOnboarding']);

    // Task routes
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::get('/tasks/statistics', [TaskController::class, 'statistics']);
    Route::get('/tasks/{id}', [TaskController::class, 'show']);
    Route::put('/tasks/{id}', [TaskController::class, 'update']);
    Route::delete('/tasks/{id}', [TaskController::class, 'destroy']);
    Route::post('/tasks/{id}/archive', [TaskController::class, 'archive']);
    Route::post('/tasks/{id}/restore', [TaskController::class, 'restore']);
    Route::get('/tasks/{id}/attachments', [TaskController::class, 'getAttachments']);
    Route::post('/tasks/{id}/attachments', [TaskController::class, 'uploadAttachment']);
    Route::get('/tasks/{taskId}/attachments/{attachmentId}/download', [TaskController::class, 'downloadAttachment']);
    Route::delete('/tasks/{taskId}/attachments/{attachmentId}', [TaskController::class, 'deleteAttachment']);
    Route::get('/tasks/{id}/participants', [TaskController::class, 'getParticipants']);
    Route::get('/tasks/{id}/subtasks', [TaskController::class, 'getSubtasks']);
    Route::post('/tasks/{id}/subtasks', [TaskController::class, 'createSubtask']);

    // Comment routes
    Route::get('/tasks/{taskId}/comments', [CommentController::class, 'index']);
    Route::post('/tasks/{taskId}/comments', [CommentController::class, 'store']);
    Route::put('/comments/{id}', [CommentController::class, 'update']);
    Route::delete('/comments/{id}', [CommentController::class, 'destroy']);

    // Task Links routes
    Route::get('/tasks/{taskId}/links', [TaskLinkController::class, 'index']);
    Route::post('/tasks/{taskId}/links', [TaskLinkController::class, 'store']);
    Route::put('/links/{linkId}', [TaskLinkController::class, 'update']);
    Route::delete('/links/{linkId}', [TaskLinkController::class, 'destroy']);

    // Time entry routes
    Route::get('/tasks/{taskId}/time-entries', [TimeEntryController::class, 'index']);
    Route::post('/time-entries', [TimeEntryController::class, 'store']);
    Route::put('/time-entries/{id}', [TimeEntryController::class, 'update']);
    Route::delete('/time-entries/{id}', [TimeEntryController::class, 'destroy']);
    Route::get('/time-entries/summary', [TimeEntryController::class, 'summary']);
    
    // Timer routes
    Route::post('/timer/start', [TimeEntryController::class, 'startTimer']);
    Route::post('/timer/{id}/stop', [TimeEntryController::class, 'stopTimer']);
    Route::get('/timer/running', [TimeEntryController::class, 'getRunningTimer']);

    // Daily Work Log routes
    Route::get('/my-work-logs', [DailyWorkLogController::class, 'myLogs']); // Get current user's logs
    Route::get('/work-logs/summary', [DailyWorkLogController::class, 'summary']); // Admin summary
    Route::get('/tasks/{task}/work-logs', [DailyWorkLogController::class, 'index']); // Get logs for task
    Route::post('/tasks/{task}/work-logs', [DailyWorkLogController::class, 'store']); // Create log
    Route::put('/tasks/{task}/work-logs/{log}', [DailyWorkLogController::class, 'update']); // Update log
    Route::delete('/tasks/{task}/work-logs/{log}', [DailyWorkLogController::class, 'destroy']); // Delete log

    // Group routes
    Route::get('/groups', [GroupController::class, 'index']);
    Route::post('/groups', [GroupController::class, 'store']); // Admin and dept admin
    Route::get('/groups/{id}', [GroupController::class, 'show']);
    Route::put('/groups/{id}', [GroupController::class, 'update']); // Admin and dept admin
    Route::delete('/groups/{id}', [GroupController::class, 'destroy']); // Admin and dept admin

    // Group Plan routes
    Route::get('/my-plans', [GroupPlanController::class, 'myPlans']); // Get all plans accessible by user
    Route::get('/groups/{group}/plans', [GroupPlanController::class, 'index']); // Get plans for a group
    Route::post('/groups/{group}/plans', [GroupPlanController::class, 'store']); // Create plan
    Route::get('/groups/{group}/plans/{plan}', [GroupPlanController::class, 'show']); // Get specific plan
    Route::put('/groups/{group}/plans/{plan}', [GroupPlanController::class, 'update']); // Update plan
    Route::delete('/groups/{group}/plans/{plan}', [GroupPlanController::class, 'destroy']); // Delete plan

    // Group Message routes (Chat)
    Route::get('/groups/{group}/messages', [GroupMessageController::class, 'index']); // Get messages
    Route::post('/groups/{group}/messages', [GroupMessageController::class, 'store']); // Send message
    Route::put('/groups/{group}/messages/{message}', [GroupMessageController::class, 'update']); // Edit message
    Route::delete('/groups/{group}/messages/{message}', [GroupMessageController::class, 'destroy']); // Delete message

    // Scheduled Plan routes (Department Admin Scheduling)
    Route::get('/scheduled-plans', [ScheduledPlanController::class, 'index']); // Get all plans
    Route::get('/scheduled-plans/calendar', [ScheduledPlanController::class, 'calendar']); // Calendar view
    Route::get('/scheduled-plans/upcoming', [ScheduledPlanController::class, 'upcoming']); // Upcoming plans
    Route::post('/scheduled-plans', [ScheduledPlanController::class, 'store']); // Create plan
    Route::get('/scheduled-plans/{id}', [ScheduledPlanController::class, 'show']); // Get specific plan
    Route::put('/scheduled-plans/{id}', [ScheduledPlanController::class, 'update']); // Update plan
    Route::delete('/scheduled-plans/{id}', [ScheduledPlanController::class, 'destroy']); // Delete plan

    // Plan Daily Entry routes (To-Do and Done tracking per day)
    Route::get('/scheduled-plans/{planId}/daily-entries', [PlanDailyEntryController::class, 'index']); // Get all entries for plan
    Route::get('/scheduled-plans/{planId}/daily-entries/{date}', [PlanDailyEntryController::class, 'show']); // Get entry for specific date
    Route::put('/scheduled-plans/{planId}/daily-entries/{date}', [PlanDailyEntryController::class, 'update']); // Update/create entry

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/{id}/unread', [NotificationController::class, 'markAsUnread']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/clear-read', [NotificationController::class, 'clearRead']); // Must be before {id} route
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // Web Push routes
    Route::get('/webpush/key', [WebPushController::class, 'getPublicKey']);
    Route::post('/webpush/subscribe', [WebPushController::class, 'subscribe']);
    Route::post('/webpush/unsubscribe', [WebPushController::class, 'unsubscribe']);
    Route::post('/webpush/test', [WebPushController::class, 'test']);

    // Leave Management routes
    Route::get('/leave-types', [LeaveController::class, 'getLeaveTypes']);
    Route::post('/leave-types', [LeaveController::class, 'createLeaveType']); // Super admin only
    Route::put('/leave-types/{id}', [LeaveController::class, 'updateLeaveType']); // Super admin only
    Route::delete('/leave-types/{id}', [LeaveController::class, 'deleteLeaveType']); // Super admin only

    Route::get('/leave-balances', [LeaveController::class, 'getMyBalances']);
    Route::get('/leave-balances/all', [LeaveController::class, 'getAllBalances']); // Admin/HR - view all employee balances with filters
    Route::get('/leave-balances/user/{userId}', [LeaveController::class, 'getUserBalances']); // Admin only
    Route::put('/leave-balances/{balanceId}', [LeaveController::class, 'updateBalance']); // Admin only

    Route::get('/leaves', [LeaveController::class, 'getAllLeaves']); // Admin/HOD/HR
    Route::get('/leaves/approved', [LeaveController::class, 'getApprovedLeaves']); // HR can view approved leaves
    Route::get('/leaves/my', [LeaveController::class, 'getMyLeaves']);
    Route::get('/leaves/user/{userId}', [LeaveController::class, 'getUserLeaves']); // Admin/HOD/Senior only
    Route::get('/leaves/pending', [LeaveController::class, 'getPendingLeaves']); // Admin only
    Route::get('/leaves/statistics', [LeaveController::class, 'getStatistics']);
    Route::get('/leaves/calendar', [LeaveController::class, 'getCalendar']);
    Route::get('/leaves/team-on-leave', [LeaveController::class, 'getTeamOnLeave']);
    Route::get('/leaves/calculate-days', [LeaveController::class, 'calculateDays']);
    Route::post('/leaves', [LeaveController::class, 'createLeave']);
    Route::get('/leaves/{id}', [LeaveController::class, 'getLeave']);
    Route::post('/leaves/{id}/approve', [LeaveController::class, 'approveLeave']); // Admin only
    Route::post('/leaves/{id}/reject', [LeaveController::class, 'rejectLeave']); // Admin only
    Route::post('/leaves/{id}/cancel', [LeaveController::class, 'cancelLeave']);

    Route::get('/holidays', [LeaveController::class, 'getHolidays']);
    Route::post('/holidays', [LeaveController::class, 'createHoliday']); // Super admin only
    Route::put('/holidays/{id}', [LeaveController::class, 'updateHoliday']); // Super admin only
    Route::delete('/holidays/{id}', [LeaveController::class, 'deleteHoliday']); // Super admin only

    // Attendance routes (Excel upload based)
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::get('/attendance/statistics', [AttendanceController::class, 'statistics']);
    Route::get('/attendance/template', [AttendanceController::class, 'downloadTemplate']);
    Route::get('/attendance/export', [AttendanceController::class, 'export']); // Export attendance to CSV
    Route::post('/attendance/upload', [AttendanceController::class, 'upload']); // Procurement/Admin only
    Route::get('/users/{userId}/attendance', [AttendanceController::class, 'userAttendance']); // Get attendance for specific user
    Route::get('/attendance/{id}', [AttendanceController::class, 'show']);
    Route::put('/attendance/{id}', [AttendanceController::class, 'update']); // Procurement only - update record
    Route::delete('/attendance/{id}', [AttendanceController::class, 'destroy']); // Procurement/Admin only

    // =====================================================
    // ATTENDANCE REQUEST SYSTEM (Out-of-Office Attendance)
    // =====================================================
    Route::prefix('attendance-requests')->group(function () {
        // Employee routes
        Route::get('/my', [AttendanceRequestController::class, 'myRequests']); // Get my requests
        Route::post('/', [AttendanceRequestController::class, 'store']); // Submit new request
        Route::delete('/{id}', [AttendanceRequestController::class, 'destroy']); // Withdraw pending request
        Route::get('/statistics', [AttendanceRequestController::class, 'statistics']); // Get stats
        
        // HOD routes (approval)
        Route::get('/pending', [AttendanceRequestController::class, 'pendingForApproval']); // Get pending requests
        Route::post('/{id}/approve', [AttendanceRequestController::class, 'approve']); // Approve request
        Route::post('/{id}/reject', [AttendanceRequestController::class, 'reject']); // Reject request
        
        // Procurement routes (sync to attendance)
        Route::get('/approved', [AttendanceRequestController::class, 'approvedForProcurement']); // Get approved requests
        Route::post('/{id}/sync', [AttendanceRequestController::class, 'markAsSynced']); // Mark as synced
        Route::post('/{id}/add-to-attendance', [AttendanceRequestController::class, 'addToAttendance']); // Add to attendance table
    });

    // =====================================================
    // GPS ATTENDANCE SYSTEM ROUTES
    // =====================================================

    // GPS Attendance - Employee Routes (Branch Employees AND Admin/Procurement with branch assignment)
    Route::prefix('gps-attendance')->group(function () {
        // Check access level
        Route::get('/access', [GpsAttendanceController::class, 'checkAccess']);
        
        // Check-in/Check-out
        Route::post('/check-in', [GpsAttendanceController::class, 'checkIn']);
        Route::post('/check-out', [GpsAttendanceController::class, 'checkOut']);
        
        // Today's status
        Route::get('/today', [GpsAttendanceController::class, 'todayStatus']);
        
        // Validate location before marking
        Route::post('/validate-location', [GpsAttendanceController::class, 'validateLocation']);
        
        // Personal history and statistics
        Route::get('/my-history', [GpsAttendanceController::class, 'myHistory']);
        Route::get('/my-statistics', [GpsAttendanceController::class, 'myStatistics']);
        
        // Corrections
        Route::post('/corrections', [GpsAttendanceController::class, 'requestCorrection']);
        Route::get('/my-corrections', [GpsAttendanceController::class, 'getMyCorrections']);
        Route::delete('/corrections/{id}', [GpsAttendanceController::class, 'withdrawCorrection']);
        
        // Admin self-assignment to branch (Admin/Procurement only)
        Route::post('/assign-me-to-branch', [GpsAttendanceController::class, 'assignMeToBranch']);
        Route::delete('/remove-my-branch/{branchId}', [GpsAttendanceController::class, 'removeMyBranchAssignment']);
        Route::get('/available-branches', [GpsAttendanceController::class, 'getAvailableBranches']);
    });

    // Branch Management - Admin Routes
    Route::prefix('branches')->group(function () {
        Route::get('/', [BranchController::class, 'index']);
        Route::post('/', [BranchController::class, 'store']);
        Route::get('/{id}', [BranchController::class, 'show']);
        Route::put('/{id}', [BranchController::class, 'update']);
        Route::delete('/{id}', [BranchController::class, 'destroy']);
        
        // Branch status
        Route::post('/{id}/activate', [BranchController::class, 'activate']);
        Route::post('/{id}/deactivate', [BranchController::class, 'deactivate']);
        
        // Branch employees
        Route::get('/{id}/employees', [BranchController::class, 'employees']);
        Route::post('/{id}/employees', [BranchController::class, 'assignEmployee']);
        Route::delete('/{branchId}/employees/{userId}', [BranchController::class, 'removeEmployee']);
        
        // Branch statistics
        Route::get('/{id}/statistics', [BranchController::class, 'statistics']);
    });

    // Attendance Reports - Finance/Admin Routes
    Route::prefix('attendance-reports')->group(function () {
        Route::get('/daily', [AttendanceReportController::class, 'dailyReport']);
        Route::get('/monthly', [AttendanceReportController::class, 'monthlyReport']);
        Route::get('/employee/{userId}', [AttendanceReportController::class, 'employeeReport']);
        Route::get('/export', [AttendanceReportController::class, 'exportCsv']);
        Route::get('/export-excel', [AttendanceReportController::class, 'exportExcel']);
        Route::get('/export-pdf', [AttendanceReportController::class, 'exportPdf']);
        Route::get('/gps-validation-stats', [AttendanceReportController::class, 'gpsValidationStats']);
        Route::get('/audit', [AttendanceReportController::class, 'auditReport']);
    });

    // Attendance Corrections - Admin Routes
    Route::prefix('attendance-corrections')->group(function () {
        Route::get('/', [AttendanceCorrectionController::class, 'index']);
        Route::get('/statistics', [AttendanceCorrectionController::class, 'statistics']);
        Route::get('/{id}', [AttendanceCorrectionController::class, 'show']);
        Route::post('/{id}/approve', [AttendanceCorrectionController::class, 'approve']);
        Route::post('/{id}/reject', [AttendanceCorrectionController::class, 'reject']);
        Route::post('/bulk-action', [AttendanceCorrectionController::class, 'bulkAction']);
    });

    // Attendance Admin - Admin Only Routes
    Route::prefix('attendance-admin')->group(function () {
        Route::get('/live', [GpsAttendanceController::class, 'getLiveAttendance']);
        Route::get('/corrections', [AttendanceCorrectionController::class, 'index']);
        Route::get('/audit-logs', [GpsAttendanceController::class, 'getAuditLogs']);
        
        // Department Attendance Settings
        Route::get('/departments', [GpsAttendanceController::class, 'getAttendanceDepartments']);
        Route::post('/departments', [GpsAttendanceController::class, 'addAttendanceDepartment']);
        Route::put('/departments/{id}', [GpsAttendanceController::class, 'updateAttendanceDepartment']);
        Route::delete('/departments/{id}', [GpsAttendanceController::class, 'removeAttendanceDepartment']);
    });

    // Branch Time Settings
    Route::put('/branches/{id}/time-settings', [BranchController::class, 'updateTimeSettings']);
});
