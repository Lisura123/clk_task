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
    Route::get('/departments/{id}/statistics', [DepartmentController::class, 'statistics']);
    Route::get('/departments/{id}/employees', [DepartmentController::class, 'employees']);
    Route::post('/departments', [DepartmentController::class, 'store']); // Super admin only
    Route::put('/departments/{id}', [DepartmentController::class, 'update']); // Super admin only
    Route::delete('/departments/{id}', [DepartmentController::class, 'destroy']); // Super admin only

    // User routes
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/basic', [UserController::class, 'basicList']);
    Route::post('/users', [UserController::class, 'store']); // Admin only
    Route::put('/users/{id}', [UserController::class, 'update']); // Admin only
    Route::delete('/users/{id}', [UserController::class, 'destroy']); // Admin only
    Route::get('/users/{id}/statistics', [UserController::class, 'statistics']);
    
    // Pending registrations
    Route::get('/users/pending/registrations', [UserController::class, 'pendingRegistrations']);
    Route::post('/users/{id}/approve', [UserController::class, 'approve']);
    Route::post('/users/{id}/reject', [UserController::class, 'reject']);

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

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/{id}/unread', [NotificationController::class, 'markAsUnread']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::delete('/notifications/clear-read', [NotificationController::class, 'clearRead']);
});
