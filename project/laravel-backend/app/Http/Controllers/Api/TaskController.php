<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\Notification;
use App\Models\User;
use App\Models\Department;
use App\Notifications\TaskAssignedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TaskController extends Controller
{
    /**
     * Get all tasks (with filters)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Task::with(['assignedTo', 'createdBy', 'tags', 'watchers', 'subtasks']);

        // By default, only show parent tasks (not subtasks) unless specifically requested
        if (!$request->boolean('include_subtasks')) {
            $query->whereNull('parent_task_id');
        }

        // Role-based filtering
        // Admins can see all tasks
        // HODs can see tasks in their managed departments
        // All employees (including senior employees) can only see tasks related to them
        if ($user->isEmployee() || $user->isSeniorEmployee()) {
            // All employees can only see tasks they're involved in:
            // - Assigned to them
            // - Created by them
            // - Watching/collaborating on
            $query->where(function ($q) use ($user) {
                $q->where('assigned_to_id', $user->id)
                  ->orWhere('created_by_id', $user->id)
                  ->orWhereHas('watchers', function ($wq) use ($user) {
                      $wq->where('user_id', $user->id);
                  });
            });
        } elseif ($user->isHod()) {
            $managedDepts = $user->managed_department_ids ?? [];
            
            // Fallback to user's department_id if managed_department_ids is empty
            if (empty($managedDepts) && $user->department_id) {
                $managedDepts = [$user->department_id];
            }
            
            if (!empty($managedDepts)) {
                // Convert department IDs to names for filtering
                $managedDeptNames = [];
                foreach ($managedDepts as $deptId) {
                    if (is_numeric($deptId)) {
                        $dept = Department::find((int)$deptId);
                        if ($dept) {
                            $managedDeptNames[] = $dept->name;
                        }
                    } else {
                        // Already a name
                        $managedDeptNames[] = $deptId;
                    }
                }
                
                if (!empty($managedDeptNames)) {
                    $query->whereIn('department', $managedDeptNames);
                }
            }
        }

        // Filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->has('department')) {
            $query->where('department', $request->department);
        }

        if ($request->has('assigned_to')) {
            $query->where('assigned_to_id', $request->assigned_to);
        }

        if ($request->boolean('my_tasks')) {
            $query->where('assigned_to_id', $user->id);
        }

        if (!$request->boolean('include_archived')) {
            $query->active();
        }

        $tasks = $query->latest()->paginate($request->get('per_page', 15));

        return response()->json([
            'tasks' => $tasks->items(),
            'pagination' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
            ]
        ]);
    }

    /**
     * Create a new task
     */
    public function store(Request $request)
    {
        // Normalize incoming payload variations
        $data = $request->all();

        // Allow `assignedToId` alias
        if (isset($data['assignedToId']) && !isset($data['assigned_to_id'])) {
            $data['assigned_to_id'] = $data['assignedToId'];
        }

        // Allow `dueDate` alias
        if (isset($data['dueDate']) && !isset($data['due_date'])) {
            $data['due_date'] = $data['dueDate'];
        }

        // Map common status alias
        if (($data['status'] ?? null) === 'pending') {
            $data['status'] = 'todo';
        }

        // If department is numeric ID, convert to name
        if (isset($data['department']) && is_numeric($data['department'])) {
            $deptModel = \App\Models\Department::find((int)$data['department']);
            if ($deptModel) {
                $data['department'] = $deptModel->name;
            }
        }

        // If department is missing or empty, default to current user's department name
        if (empty($data['department'])) {
            $deptName = $request->user()->department;
            if (!$deptName && $request->user()->department_id) {
                $deptModel = \App\Models\Department::find((int)$request->user()->department_id);
                $deptName = $deptModel?->name;
            }
            $data['department'] = $deptName;
        }

        $validator = Validator::make($data, [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department' => 'required|string|max:100',
            'assigned_to_id' => 'nullable|exists:users,id',
            'priority' => 'required|in:low,medium,high',
            'status' => 'sometimes|in:todo,in-progress,completed,on-hold',
            'due_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
            'parent_task_id' => 'nullable|exists:tasks,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();

        // Check permissions - only regular employees cannot create tasks
        // Admin, HOD, and Senior Employee can all create tasks across departments
        if ($user->isEmployee() && !$user->isSeniorEmployee()) {
            return response()->json(['message' => 'Employees cannot create tasks'], 403);
        }

        // HODs and Senior Employees can create tasks across ALL departments
        // No department restriction for task creation
        
        $task = Task::create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'department' => $data['department'],
            'assigned_to_id' => $data['assigned_to_id'] ?? null,
            'created_by_id' => $user->id,
            'priority' => $data['priority'],
            'status' => $data['status'] ?? 'todo',
            'due_date' => $data['due_date'] ?? null,
            'estimated_hours' => $data['estimated_hours'] ?? null,
            'progress' => 0,
            'parent_task_id' => $data['parent_task_id'] ?? null,
        ]);

        // Create notification for assigned user
        if ($task->assigned_to_id) {
            Notification::create([
                'user_id' => $task->assigned_to_id,
                'triggered_by_id' => $user->id,
                'type' => 'task_assigned',
                'title' => 'New Task Assigned',
                'message' => "You have been assigned a new task: {$task->title}",
                'task_id' => $task->id,
            ]);

            // Send email notification to the assigned employee
            $assignedUser = User::find($task->assigned_to_id);
            if ($assignedUser && $assignedUser->email) {
                try {
                    $assignedUser->notify(new TaskAssignedNotification($task, $user));
                } catch (\Exception $e) {
                    \Log::error('Failed to send task assignment email: ' . $e->getMessage());
                }
            }
        }

        return response()->json([
            'message' => 'Task created successfully',
            'task' => $task->load(['assignedTo', 'createdBy']),
        ], 201);
    }

    /**
     * Get a specific task
     */
    public function show(Request $request, $id)
    {
        $task = Task::with([
            'assignedTo',
            'createdBy',
            'comments.user',
            'comments.replies.user',
            'attachments',
            'activities.user',
            'timeEntries.user',
            'watchers.user',
            'tags',
            'parentTask',
            'subtasks.assignedTo',
        ])->findOrFail($id);

        $user = $request->user();

        // Check permissions
        if (!$this->userCanAccessTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['data' => $task]);
    }

    /**
     * Update a task
     */
    public function update(Request $request, $id)
    {
        $task = Task::findOrFail($id);
        $user = $request->user();

        // Check permissions - Senior employees can update any task
        // Use loose comparison (!=) to handle integer/string type differences
        if ($user->isEmployee() && !$user->isSeniorEmployee() && $task->assigned_to_id != $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isHod() && !$user->managesDepartment($task->department)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'assigned_to_id' => 'sometimes|nullable|exists:users,id',
            'priority' => 'sometimes|in:low,medium,high',
            'status' => 'sometimes|in:todo,in-progress,completed,on-hold',
            'progress' => 'sometimes|integer|min:0|max:100',
            'due_date' => 'sometimes|nullable|date',
            'estimated_hours' => 'sometimes|nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldData = $task->toArray();
        $oldAssignedToId = $task->assigned_to_id;
        $task->update($request->all());

        // Auto-complete when progress reaches 100%
        if ($request->has('progress') && $request->progress == 100 && $task->status !== 'completed') {
            $task->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
        }

        // Send email notification if task is reassigned to a different user
        if ($request->has('assigned_to_id') && $request->assigned_to_id != $oldAssignedToId && $request->assigned_to_id) {
            // Create in-app notification
            Notification::create([
                'user_id' => $request->assigned_to_id,
                'triggered_by_id' => $user->id,
                'type' => 'task_assigned',
                'title' => 'Task Assigned to You',
                'message' => "You have been assigned a task: {$task->title}",
                'task_id' => $task->id,
            ]);

            // Send email notification
            $assignedUser = User::find($request->assigned_to_id);
            if ($assignedUser && $assignedUser->email) {
                try {
                    $assignedUser->notify(new TaskAssignedNotification($task, $user));
                } catch (\Exception $e) {
                    \Log::error('Failed to send task reassignment email: ' . $e->getMessage());
                }
            }
        }

        // Track changes in activity log
        $this->logTaskChanges($task, $oldData, $user);

        return response()->json([
            'message' => 'Task updated successfully',
            'task' => $task->load(['assignedTo', 'createdBy']),
        ]);
    }

    /**
     * Delete a task
     */
    public function destroy(Request $request, $id)
    {
        $task = Task::findOrFail($id);
        $user = $request->user();

        // Only admins can delete tasks
        if ($user->isEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isDeptAdmin() && !$user->managesDepartment($task->department)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully',
        ]);
    }

    /**
     * Archive a task
     */
    public function archive($id)
    {
        $task = Task::findOrFail($id);
        
        $task->update([
            'is_archived' => true,
            'archived_at' => now(),
        ]);

        return response()->json([
            'message' => 'Task archived successfully',
            'task' => $task,
        ]);
    }

    /**
     * Restore an archived task
     */
    public function restore($id)
    {
        $task = Task::findOrFail($id);
        
        $task->update([
            'is_archived' => false,
            'archived_at' => null,
        ]);

        return response()->json([
            'message' => 'Task restored successfully',
            'task' => $task,
        ]);
    }

    /**
     * Get task statistics
     */
    public function statistics(Request $request)
    {
        $user = $request->user();
        $query = Task::query();

        // Employees and Senior Employees see only tasks assigned to them
        if ($user->isEmployee() || $user->isSeniorEmployee()) {
            $query->where('assigned_to_id', $user->id);
        } elseif ($user->isDeptAdmin()) {
            $managedDepts = $user->managed_department_ids ?? [];
            
            // Fallback to user's department_id if managed_department_ids is empty
            if (empty($managedDepts) && $user->department_id) {
                $managedDepts = [$user->department_id];
            }
            
            if (!empty($managedDepts)) {
                // Get department names from IDs since tasks store department names in 'department' column
                $deptNames = Department::whereIn('id', $managedDepts)->pluck('name')->toArray();
                // Tasks only have 'department' column which stores department name
                $query->whereIn('department', $deptNames);
            }
        }

        $total = $query->count();
        $todo = (clone $query)->where('status', 'todo')->count();
        $inProgress = (clone $query)->where('status', 'in-progress')->count();
        $completed = (clone $query)->where('status', 'completed')->count();
        $onHold = (clone $query)->where('status', 'on-hold')->count();
        $overdue = (clone $query)->where('due_date', '<', now())->where('status', '!=', 'completed')->count();

        $stats = [
            'total' => $total,
            'totalTasks' => $total,
            'todo' => $todo,
            'inProgress' => $inProgress,
            'in_progress' => $inProgress,
            'completed' => $completed,
            'on_hold' => $onHold,
            'onHold' => $onHold,
            'overdue' => $overdue,
            'completionRate' => $total > 0 ? round(($completed / $total) * 100, 2) : 0,
            'priority' => [
                'urgent' => (clone $query)->where('priority', 'urgent')->count(),
                'high' => (clone $query)->where('priority', 'high')->count(),
                'medium' => (clone $query)->where('priority', 'medium')->count(),
                'low' => (clone $query)->where('priority', 'low')->count(),
            ],
            'recentTasks' => (clone $query)->with(['assignedTo', 'createdBy'])
                ->latest()
                ->limit(5)
                ->get(),
            'criticalTasks' => (clone $query)->with(['assignedTo', 'createdBy'])
                ->where('status', '!=', 'completed')
                ->where('due_date', '<=', now()->addDays(7))
                ->orderBy('due_date', 'asc')
                ->limit(5)
                ->get(),
        ];

        // Add department-specific statistics for dept admins
        if ($user->isDeptAdmin()) {
            $managedDepts = $user->managed_department_ids ?? [];
            
            // Fallback to user's department_id if managed_department_ids is empty
            if (empty($managedDepts) && $user->department_id) {
                $managedDepts = [$user->department_id];
            }
            
            // Get department names for filtering
            $deptNames = Department::whereIn('id', $managedDepts)->pluck('name')->toArray();
            
            // Count employees in managed departments (only active employees, exclude super_admin)
            $totalEmployees = User::where('status', 'active')
                ->where('role', '!=', 'admin')
                ->whereIn('department', $deptNames)
                ->count();
            
            $stats['totalEmployees'] = $totalEmployees;
            
            // Get stats per department
            $departmentStats = [];
            foreach ($managedDepts as $deptId) {
                $dept = Department::find($deptId);
                if ($dept) {
                    // Query tasks by department name (tasks store department name in 'department' column)
                    $deptTaskQuery = Task::where('department', $dept->name);
                    $departmentStats[] = [
                        'id' => $dept->id,
                        'department' => $dept->name,
                        'totalTasks' => $deptTaskQuery->count(),
                        'completed' => (clone $deptTaskQuery)->where('status', 'completed')->count(),
                        'inProgress' => (clone $deptTaskQuery)->where('status', 'in-progress')->count(),
                        'todo' => (clone $deptTaskQuery)->where('status', 'todo')->count(),
                    ];
                }
            }
            $stats['departmentStats'] = $departmentStats;
        }

        // Add user and department statistics for super admins
        if ($user->isSuperAdmin()) {
            $stats['users'] = [
                'total' => User::where('status', '!=', 'pending')->count(),
                'active' => User::where('status', 'active')->count(),
                'departmentAdmins' => User::where('role', 'hod')->where('status', '!=', 'pending')->count(),
            ];
            $stats['totalDepartments'] = Department::count();
        }

        return response()->json(['data' => $stats]);
    }

    /**
     * Log task changes
     */
    private function logTaskChanges($task, $oldData, $user)
    {
        $changes = $task->getChanges();
        
        foreach ($changes as $field => $newValue) {
            if (in_array($field, ['updated_at'])) continue;
            
            $oldValue = $oldData[$field] ?? null;
            
            if ($oldValue != $newValue) {
                TaskActivity::create([
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'activity_type' => $this->getActivityType($field),
                    'description' => $this->getActivityDescription($field, $oldValue, $newValue),
                    'metadata' => [
                        'field' => $field,
                        'old_value' => $oldValue,
                        'new_value' => $newValue,
                    ],
                ]);
            }
        }
    }

    private function getActivityType($field)
    {
        $mapping = [
            'status' => 'status_changed',
            'progress' => 'progress_updated',
            'assigned_to_id' => 'assignment_changed',
            'due_date' => 'due_date_changed',
            'priority' => 'priority_changed',
            'department' => 'department_changed',
        ];

        return $mapping[$field] ?? 'task_edited';
    }

    private function getActivityDescription($field, $oldValue, $newValue)
    {
        return "Changed {$field} from '{$oldValue}' to '{$newValue}'";
    }

    /**
     * Get task attachments
     */
    public function getAttachments(Request $request, $id)
    {
        $task = Task::findOrFail($id);
        $user = $request->user();

        // Check permissions
        if (!$this->userCanAccessTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $attachments = $task->attachments ?? [];
        return response()->json(['data' => ['attachments' => $attachments]]);
    }

    /**
     * Get task participants (watchers)
     */
    public function getParticipants(Request $request, $id)
    {
        $task = Task::findOrFail($id);
        $user = $request->user();

        // Check permissions
        if (!$this->userCanAccessTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $participants = $task->watchers()->with('user')->get()->map(function ($watcher) {
            return [
                'id' => $watcher->user->id,
                'name' => $watcher->user->name,
                'email' => $watcher->user->email,
                'role' => $watcher->user->role,
            ];
        });

        return response()->json(['participants' => $participants]);
    }

    /**
     * Upload attachment to task
     */
    public function uploadAttachment(Request $request, $id)
    {
        try {
            \Log::info('Upload attempt for task: ' . $id);
            \Log::info('User: ' . $request->user()->id);
            \Log::info('Has file: ' . ($request->hasFile('file') ? 'yes' : 'no'));
            
            $task = Task::findOrFail($id);
            $user = $request->user();

            // Check permissions
            if (!$this->userCanAccessTask($user, $task)) {
                \Log::error('Permission denied for user ' . $user->id);
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            if (!$request->hasFile('file')) {
                return response()->json(['message' => 'No file provided'], 400);
            }

            $file = $request->file('file');
            
            if (!$file->isValid()) {
                return response()->json(['message' => 'Invalid file upload'], 400);
            }

            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('attachments', $filename, 'public');

            \Log::info('File stored at: ' . $path);

            $attachment = \App\Models\TaskAttachment::create([
                'task_id' => $task->id,
                'file_name' => $file->getClientOriginalName(),
                'file_url' => '/storage/' . $path,
                'file_size' => $file->getSize(),
                'uploaded_by' => $user->id,
            ]);

            \Log::info('Attachment created: ' . $attachment->id);

            // Create notification for task assignee
            if ($task->assigned_to_id && $task->assigned_to_id !== $user->id) {
                Notification::create([
                    'user_id' => $task->assigned_to_id,
                    'triggered_by_id' => $user->id,
                    'type' => 'file_added',
                    'title' => 'New File Uploaded to Task',
                    'message' => $user->name . " uploaded a file to task: {$task->title}",
                    'task_id' => $task->id,
                ]);
            }

            // Also notify task creator if different
            if ($task->created_by_id && 
                $task->created_by_id !== $user->id && 
                $task->created_by_id !== $task->assigned_to_id) {
                Notification::create([
                    'user_id' => $task->created_by_id,
                    'triggered_by_id' => $user->id,
                    'type' => 'file_added',
                    'title' => 'New File Uploaded to Task',
                    'message' => $user->name . " uploaded a file to task: {$task->title}",
                    'task_id' => $task->id,
                ]);
            }

            return response()->json([
                'message' => 'File uploaded successfully',
                'attachment' => $attachment
            ], 201);
        } catch (\Exception $e) {
            \Log::error('File upload error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Failed to upload file',
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }

    /**
     * Delete attachment from task
     */
    public function deleteAttachment(Request $request, $taskId, $attachmentId)
    {
        $task = Task::findOrFail($taskId);
        $user = $request->user();

        // Check permissions
        if (!$this->userCanAccessTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $attachment = \App\Models\TaskAttachment::where('task_id', $taskId)
            ->where('id', $attachmentId)
            ->firstOrFail();
        
        // Delete file from storage if it exists
        $filePath = str_replace('/storage/', '', $attachment->file_url);
        if (Storage::disk('public')->exists($filePath)) {
            Storage::disk('public')->delete($filePath);
        }

        $attachment->delete();

        return response()->json(['message' => 'Attachment deleted successfully']);
    }

    /**
     * Download attachment
     */
    public function downloadAttachment(Request $request, $taskId, $attachmentId)
    {
        $task = Task::findOrFail($taskId);
        $user = $request->user();

        // Check permissions
        if (!$this->userCanAccessTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $attachment = \App\Models\TaskAttachment::where('task_id', $taskId)
            ->where('id', $attachmentId)
            ->firstOrFail();
        
        // Get file path from storage
        $filePath = str_replace('/storage/', '', $attachment->file_url);
        
        if (!Storage::disk('public')->exists($filePath)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        return Storage::disk('public')->download($filePath, $attachment->file_name);
    }

    /**
     * Check if user can access task
     */
    private function userCanAccessTask($user, $task)
    {
        // Admins can access all tasks
        if ($user->isAdmin()) {
            return true;
        }

        // Senior employees can access all tasks (cross-department access)
        if ($user->isSeniorEmployee()) {
            return true;
        }

        // Regular employees can only access tasks assigned to them or created by them
        if ($user->isEmployee()) {
            return $task->assigned_to_id === $user->id || $task->created_by_id === $user->id;
        }

        // HODs can access tasks in their managed departments
        if ($user->isHod()) {
            return $user->managesDepartment($task->department);
        }

        return false;
    }

    /**
     * Get subtasks for a specific task
     */
    public function getSubtasks(Request $request, $id)
    {
        $task = Task::findOrFail($id);
        $user = $request->user();

        // Check permissions
        if (!$this->userCanAccessTask($user, $task)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $subtasks = $task->subtasks()
            ->with(['assignedTo', 'createdBy'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'subtasks' => $subtasks,
            'parent_task' => [
                'id' => $task->id,
                'title' => $task->title,
            ],
        ]);
    }

    /**
     * Create a subtask for a specific task
     */
    public function createSubtask(Request $request, $id)
    {
        $parentTask = Task::findOrFail($id);
        $user = $request->user();

        // Check permissions - only regular employees cannot create subtasks
        // Admin, HOD, and Senior Employee can all create subtasks across departments
        if ($user->isEmployee() && !$user->isSeniorEmployee()) {
            return response()->json(['message' => 'Employees cannot create subtasks'], 403);
        }

        // HODs and Senior Employees can create subtasks across ALL departments
        // No department restriction for subtask creation

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to_id' => 'nullable|exists:users,id',
            'priority' => 'required|in:low,medium,high',
            'status' => 'sometimes|in:todo,in-progress,completed,on-hold',
            'due_date' => 'nullable|date',
            'estimated_hours' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $subtask = Task::create([
            'title' => $request->title,
            'description' => $request->description ?? null,
            'department' => $parentTask->department, // Inherit department from parent
            'assigned_to_id' => $request->assigned_to_id ?? null,
            'created_by_id' => $user->id,
            'priority' => $request->priority,
            'status' => $request->status ?? 'todo',
            'due_date' => $request->due_date ?? null,
            'estimated_hours' => $request->estimated_hours ?? null,
            'progress' => 0,
            'parent_task_id' => $parentTask->id,
        ]);

        // Create notification for assigned user
        if ($subtask->assigned_to_id) {
            Notification::create([
                'user_id' => $subtask->assigned_to_id,
                'triggered_by_id' => $user->id,
                'type' => 'task_assigned',
                'title' => 'New Subtask Assigned',
                'message' => "You have been assigned a subtask: {$subtask->title} (for task: {$parentTask->title})",
                'task_id' => $subtask->id,
            ]);
        }

        return response()->json([
            'message' => 'Subtask created successfully',
            'subtask' => $subtask->load(['assignedTo', 'createdBy']),
        ], 201);
    }
}
