<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Department;
use App\Models\Notification;
use App\Notifications\RegistrationApprovedNotification;
use App\Notifications\EmployeeAccountCreatedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    /**
     * Get all users
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = User::with(['departmentRelation', 'branches']);

        \Log::info('UserController index called', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'is_dept_admin_check' => $user->isDeptAdmin(),
            'is_hr' => $user->isHR(),
            'managed_department_ids' => $user->managed_department_ids
        ]);

        // HR users can see all employees (like admin)
        // Admin can see all employees
        // HOD can see their managed departments only
        // Other employees should not access this endpoint
        
        if ($user->isHR()) {
            // HR can see all users - no filtering needed
            \Log::info('HR user - showing all users');
        } elseif ($user->isDeptAdmin()) {
            // Filter by managed departments for dept admin
            $managedDeptIds = $user->managed_department_ids ?? [];
            \Log::info('Dept Admin filtering users', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_role' => $user->role,
                'managed_department_ids' => $managedDeptIds,
                'managed_department_ids_type' => gettype($managedDeptIds)
            ]);
            
            if (!empty($managedDeptIds)) {
                // Get department names for the managed department IDs
                $deptNames = Department::whereIn('id', $managedDeptIds)->pluck('name')->toArray();
                
                // Filter by department_id OR department name (for users without department_id)
                $query->where(function($q) use ($managedDeptIds, $deptNames) {
                    $q->whereIn('department_id', $managedDeptIds)
                      ->orWhereIn('department', $deptNames);
                });
                
                // Log the SQL query
                $sql = $query->toSql();
                $bindings = $query->getBindings();
                \Log::info('SQL Query', [
                    'sql' => $sql,
                    'bindings' => json_encode($bindings),
                    'dept_names' => $deptNames
                ]);
            } else {
                // If no managed departments, return empty result
                \Log::warning('Dept admin has no managed departments');
                $query->whereRaw('1 = 0');
            }
        } elseif (!$user->isAdmin()) {
            // Regular employees (non-procurement) should not see all users
            // Return only users from their own department
            $query->where('department_id', $user->department_id);
        }
        // Admin sees all users - no filtering needed

        if ($request->has('department')) {
            $query->where('department', $request->department);
        }

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $users = $query->latest()->paginate($request->get('per_page', 15));
        
        \Log::info('Users fetched', [
            'count' => $users->count(),
            'total' => $users->total()
        ]);
        
        // Log first user if exists
        if ($users->count() > 0) {
            \Log::info('First user sample:', [
                'id' => $users[0]->id,
                'name' => $users[0]->name,
                'department_id' => $users[0]->department_id,
                'department' => $users[0]->department
            ]);
        }
        
        // Add department_name to each user for easier frontend access
        $users->getCollection()->transform(function ($user) {
            $user->department_name = $user->departmentRelation?->name ?? $user->department ?? null;
            return $user;
        });

        return response()->json($users);
    }

    /**
     * Get a single user with full details
     */
    public function show(Request $request, $id)
    {
        $currentUser = $request->user();
        
        $user = User::with(['departmentRelation', 'assignedTasks', 'createdTasks', 'branches'])
            ->findOrFail($id);
        
        // Permission check using the new canViewEmployeeDetails method
        // Admin, Senior Employee, and Procurement can view all
        // HOD can view employees in their managed departments
        // Regular employees can only view themselves or same department
        if (!$currentUser->canViewEmployeeDetails($user)) {
            // Fall back to basic same-department check for regular employees
            if ($currentUser->isEmployee() && !$currentUser->isSeniorEmployee()) {
                if ($currentUser->id !== $user->id && $currentUser->department_id !== $user->department_id) {
                    return response()->json(['message' => 'Unauthorized'], 403);
                }
            } else {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }
        
        // Get task statistics
        $assignedTasks = $user->assignedTasks;
        $createdTasks = $user->createdTasks;
        
        $taskStats = [
            'total_assigned' => $assignedTasks->count(),
            'completed' => $assignedTasks->where('status', 'completed')->count(),
            'in_progress' => $assignedTasks->where('status', 'in-progress')->count(),
            'todo' => $assignedTasks->where('status', 'todo')->count(),
            'on_hold' => $assignedTasks->where('status', 'on-hold')->count(),
            'overdue' => $assignedTasks->where('status', '!=', 'completed')
                ->filter(fn($t) => $t->due_date && \Carbon\Carbon::parse($t->due_date)->isPast())
                ->count(),
            'total_created' => $createdTasks->count(),
        ];
        
        // Get recent tasks (last 10)
        $recentTasks = $assignedTasks->sortByDesc('created_at')->take(10)->values();
        
        // Calculate completion rate
        $completionRate = $taskStats['total_assigned'] > 0 
            ? round(($taskStats['completed'] / $taskStats['total_assigned']) * 100, 1) 
            : 0;
        
        // Get activity timeline (recent task status changes)
        $recentActivity = \App\Models\TaskActivity::where('user_id', $user->id)
            ->with('task')
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get();
        
        // Department info
        $department = $user->departmentRelation;
        
        // Managed departments (for HODs)
        $managedDepartments = [];
        if ($user->managed_department_ids) {
            $managedDepartments = Department::whereIn('id', $user->managed_department_ids)->get(['id', 'name']);
        }
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'emp_code' => $user->emp_code,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'status' => $user->status,
                'profile_picture' => $user->profile_picture,
                'department_id' => $user->department_id,
                'department_name' => $department?->name ?? $user->department,
                'managed_department_ids' => $user->managed_department_ids,
                'managed_departments' => $managedDepartments,
                'email_notifications' => $user->email_notifications,
                'task_reminders' => $user->task_reminders,
                'comment_notifications' => $user->comment_notifications,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ],
            'task_stats' => $taskStats,
            'completion_rate' => $completionRate,
            'recent_tasks' => $recentTasks,
            'recent_activity' => $recentActivity,
        ]);
    }

    /**
     * Get pending registrations
     */
    public function pendingRegistrations(Request $request)
    {
        $user = $request->user();

        if ($user->isEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = User::where('status', 'pending');

        if ($user->isDeptAdmin()) {
            $managedDepts = $user->managed_department_ids ?? [];
            // Get department names from IDs
            $deptNames = Department::whereIn('id', $managedDepts)->pluck('name')->toArray();
            $query->whereIn('department', $deptNames);
        }

        $pending = $query->latest()->get();

        return response()->json([
            'data' => $pending
        ]);
    }

    /**
     * Approve user registration
     */
    public function approve(Request $request, $id)
    {
        $user = $request->user();

        if ($user->isEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $targetUser = User::findOrFail($id);

        if ($user->isDeptAdmin() && !$user->managesDepartment($targetUser->department)) {
            return response()->json(['message' => 'You cannot approve users from this department'], 403);
        }

        // Set department_id if not already set (for self-registered users)
        $updateData = ['status' => 'active'];
        if (!$targetUser->department_id && $targetUser->department) {
            $department = Department::where('name', $targetUser->department)->first();
            if ($department) {
                $updateData['department_id'] = $department->id;
            }
        }
        
        $targetUser->update($updateData);

        // Send email notification to the approved user
        try {
            \Log::info('Sending registration approval email to: ' . $targetUser->email);
            $targetUser->notify(new RegistrationApprovedNotification($user->name));
            \Log::info('Registration approval email sent successfully');
        } catch (\Exception $e) {
            \Log::error('Failed to send approval email: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
        }

        // Notify the user that their registration was approved (in-app notification)
        Notification::create([
            'user_id' => $targetUser->id,
            'triggered_by_id' => $user->id,
            'type' => 'registration_approved',
            'title' => 'Registration Approved',
            'message' => 'Your registration has been approved. You can now login to the system.',
            'task_id' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User approved successfully',
            'user' => $targetUser,
        ]);
    }

    /**
     * Reject user registration
     */
    public function reject(Request $request, $id)
    {
        $user = $request->user();

        if ($user->isEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $targetUser = User::findOrFail($id);

        if ($user->isDeptAdmin() && !$user->managesDepartment($targetUser->department)) {
            return response()->json(['message' => 'You cannot reject users from this department'], 403);
        }

        // Update status to rejected
        $targetUser->update(['status' => 'rejected']);

        // Notify the user that their registration was rejected
        Notification::create([
            'user_id' => $targetUser->id,
            'triggered_by_id' => $user->id,
            'type' => 'registration_rejected',
            'title' => 'Registration Rejected',
            'message' => $request->reason ?? 'Your registration has been rejected.',
            'task_id' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User rejected successfully',
            'user' => $targetUser,
        ]);
    }

    /**
     * Create employee (by admin)
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->isEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:50|unique:users',
            'email' => 'required|string|email|max:100|unique:users',
            'password' => 'required|string|min:8',
            'department' => 'required|string|max:100',
            'role' => 'required|in:employee,senior_employee,hod,admin',
            'phone' => 'nullable|string|max:20',
            'managed_department_ids' => 'nullable|array',
            'branch' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Validate branch is required for Sales department
        if (strtolower($request->department) === 'sales' && empty($request->branch)) {
            return response()->json([
                'errors' => ['branch' => ['Branch location is required for Sales department.']]
            ], 422);
        }

        // Check if dept admin can create user in this department
        if ($user->isHod()) {
            // HODs can only create employees and senior employees, not other HODs or admins
            if (!in_array($request->role, ['employee', 'senior_employee'])) {
                return response()->json(['message' => 'HODs can only create employee and senior employee accounts'], 403);
            }
            if (!$user->managesDepartment($request->department)) {
                return response()->json(['message' => 'You cannot create users for this department'], 403);
            }
        }

        // Get department_id
        $department = Department::where('name', $request->department)->first();

        $newUser = User::create([
            'name' => $request->name,
            'username' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'department' => $request->department,
            'department_id' => $department?->id,
            'role' => $request->role,
            'phone' => $request->phone,
            'managed_department_ids' => $request->managed_department_ids,
            'status' => 'active',
        ]);

        // If Sales department and branch provided, create branch assignment
        if (strtolower($request->department) === 'sales' && $request->branch) {
            $branch = \App\Models\Branch::where('name', $request->branch)->first();
            if ($branch) {
                \App\Models\UserBranchAssignment::create([
                    'user_id' => $newUser->id,
                    'branch_id' => $branch->id,
                    'is_primary_branch' => true,
                    'status' => 'active',
                    'assigned_by' => $user->id,
                    'assigned_at' => now(),
                    'effective_from' => now(),
                    'notes' => 'Assigned during admin employee creation',
                ]);
            }
        }

        // Send email notification with login credentials
        try {
            $credentials = [
                'username' => $request->username,
                'email' => $request->email,
                'password' => $request->password, // Plain text password for email
                'department' => $request->department,
                'role' => $request->role,
                'branch' => $request->branch,
            ];
            
            \Log::info('Sending employee account creation email to: ' . $newUser->email);
            $newUser->notify(new EmployeeAccountCreatedNotification($credentials, $user->name));
            \Log::info('Employee account creation email sent successfully');
        } catch (\Exception $e) {
            \Log::error('Failed to send employee account creation email: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
        }

        return response()->json([
            'message' => 'User created successfully',
            'data' => $newUser,
        ], 201);
    }

    /**
     * Update user
     */
    public function update(Request $request, $id)
    {
        \Log::info('========= UPDATE METHOD CALLED =========', [
            'target_user_id' => $id,
            'all_input' => $request->all(),
            'method' => $request->method(),
        ]);
        
        $user = $request->user();
        $targetUser = User::findOrFail($id);

        \Log::info('Update context', [
            'current_user_id' => $user->id,
            'current_user_role' => $user->role,
            'is_hr' => $user->isHR(),
            'is_admin' => $user->isAdmin(),
            'is_hod' => $user->isHod(),
            'is_employee' => $user->isEmployee(),
        ]);

        // Regular employees cannot update other users
        if ($user->isEmployee() && !$user->isHR()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // HR users can update employee data (like Admin/HOD)
        if ($user->isHR() && !$user->isAdmin() && !$user->isHod()) {
            \Log::info('HR update request', [
                'all_input' => $request->all(),
                'emp_code_input' => $request->input('emp_code'),
                'has_emp_code' => $request->has('emp_code'),
            ]);
            
            // HR can update basic employee info but not roles/status for non-HR departments
            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|string|max:255',
                'username' => 'sometimes|string|max:50|unique:users,username,' . $id,
                'email' => 'sometimes|email|unique:users,email,' . $id,
                'phone' => 'sometimes|nullable|string|max:20',
                'phone_number' => 'sometimes|nullable|string|max:20',
                'emp_code' => 'sometimes|nullable|string|max:50|unique:users,emp_code,' . $id,
                'department_id' => 'sometimes|exists:departments,id',
            ]);
            
            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }
            
            $updateData = $request->only(['name', 'username', 'email', 'phone', 'emp_code', 'department_id']);
            
            // Map phone_number to phone if provided
            if ($request->has('phone_number')) {
                $updateData['phone'] = $request->phone_number;
            }
            
            // If department_id is provided, get the department name
            if ($request->has('department_id') && $request->department_id) {
                $department = \App\Models\Department::find($request->department_id);
                if ($department) {
                    $updateData['department'] = $department->name;
                }
            }
            
            // Handle emp_code explicitly - keep it even if empty (to clear it)
            $empCodeValue = $request->input('emp_code');
            if ($request->has('emp_code')) {
                $updateData['emp_code'] = !empty($empCodeValue) ? $empCodeValue : null;
            }
            
            // Filter out null/empty values for other fields, but keep emp_code
            $finalData = [];
            foreach ($updateData as $key => $value) {
                if ($key === 'emp_code') {
                    $finalData[$key] = $value; // Always include emp_code
                } elseif ($value !== null && $value !== '') {
                    $finalData[$key] = $value;
                }
            }
            
            \Log::info('Final update data', ['finalData' => $finalData, 'target_user_id' => $targetUser->id]);
            
            $targetUser->update($finalData);
            
            \Log::info('After update', ['emp_code' => $targetUser->fresh()->emp_code]);
            
            return response()->json([
                'message' => 'User updated successfully',
                'user' => $targetUser->fresh(),
            ]);
        }

        // HOD can only update users in their managed departments
        if ($user->isDeptAdmin() && !$user->isAdmin() && !$user->managesDepartment($targetUser->department)) {
            return response()->json(['message' => 'You cannot update users from this department'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'username' => 'sometimes|string|max:50|unique:users,username,' . $id,
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'sometimes|nullable|string|min:8',
            'department' => 'sometimes|string|max:100',
            'department_id' => 'sometimes|exists:departments,id',
            'role' => 'sometimes|in:employee,senior_employee,hod,admin',
            'phone' => 'sometimes|nullable|string|max:20',
            'phone_number' => 'sometimes|nullable|string|max:20',
            'status' => 'sometimes|in:pending,active,inactive,rejected',
            'managed_department_ids' => 'sometimes|nullable|array',
            'emp_code' => 'sometimes|nullable|string|max:50|unique:users,emp_code,' . $id,
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Dept admins cannot change roles to super_admin
        if ($user->isDeptAdmin() && $request->has('role') && $request->role === 'admin') {
            return response()->json(['message' => 'You cannot assign super admin role'], 403);
        }

        // Handle department_id to department name conversion
        $updateData = $request->only([
            'name', 'username', 'email', 'password', 'department', 
            'department_id', 'role', 'phone', 'phone_number', 'status', 
            'managed_department_ids', 'emp_code'
        ]);
        
        \Log::info('General update - validated request data', ['data' => $updateData, 'emp_code' => $request->input('emp_code')]);
        
        // Map phone_number to phone if provided
        if ($request->has('phone_number')) {
            $updateData['phone'] = $request->phone_number;
            unset($updateData['phone_number']);
        }
        
        // If department_id is provided, get the department name
        if ($request->has('department_id')) {
            $department = Department::find($request->department_id);
            if ($department) {
                $updateData['department'] = $department->name;
                $updateData['department_id'] = $department->id;
            }
        }
        
        // Handle emp_code explicitly
        if ($request->has('emp_code')) {
            $updateData['emp_code'] = $request->input('emp_code') ?: null;
        }
        
        // Hash password if provided
        if ($request->has('password') && $request->password) {
            $updateData['password'] = Hash::make($request->password);
        } else {
            unset($updateData['password']);
        }

        \Log::info('Final update data', ['finalData' => $updateData, 'target_user_id' => $targetUser->id]);
        
        $targetUser->update($updateData);
        
        \Log::info('After update', ['emp_code' => $targetUser->fresh()->emp_code]);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $targetUser->fresh(),
        ]);
    }

    /**
     * Delete user
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $targetUser = User::findOrFail($id);

        if ($user->isEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isDeptAdmin() && !$user->managesDepartment($targetUser->department)) {
            return response()->json(['message' => 'You cannot delete users from this department'], 403);
        }

        if ($targetUser->id === $user->id) {
            return response()->json(['message' => 'You cannot delete yourself'], 422);
        }

        $targetUser->delete();

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    /**
     * Get user statistics
     */
    public function statistics(Request $request, $id)
    {
        $user = $request->user();
        $targetUser = User::findOrFail($id);

        // Authorization check - only admins, HODs (for their department), or the user themselves can view stats
        if ($user->id !== $targetUser->id) {
            // Not viewing own stats - need to be admin or HOD
            if ($user->isEmployee() && !$user->isSeniorEmployee()) {
                return response()->json(['message' => 'Unauthorized to view other user statistics'], 403);
            }
            
            // HODs can only view stats for users in their managed departments
            if ($user->isHod() && !$user->isAdmin() && !$user->managesDepartment($targetUser->department)) {
                return response()->json(['message' => 'You can only view statistics for users in your department'], 403);
            }
        }

        $stats = [
            'total_tasks' => $targetUser->assignedTasks()->count(),
            'completed_tasks' => $targetUser->assignedTasks()->completed()->count(),
            'in_progress_tasks' => $targetUser->assignedTasks()->where('status', 'in-progress')->count(),
            'total_time_logged' => $targetUser->timeEntries()->sum('duration_minutes'),
            'tasks_created' => $targetUser->createdTasks()->count(),
            'comments_made' => $targetUser->comments()->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Get basic user list (id, name, email)
     */
    public function basicList(Request $request)
    {
        $user = $request->user();
        $query = User::select('id', 'username', 'name', 'email', 'role', 'department', 'department_id', 'status')
            ->where('status', 'active');

        // Filter by department for dept admins
        if ($user->isDeptAdmin()) {
            $managedDepts = $user->managed_department_ids ?? [];
            // Filter by department_id (integer) not department (string)
            if (!empty($managedDepts)) {
                $query->whereIn('department_id', $managedDepts);
            }
        }

        $users = $query->get()->map(function ($u) {
            return [
                'id' => $u->id,
                'username' => $u->username,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'department' => $u->department,
                'department_id' => $u->department_id,
                'status' => $u->status,
            ];
        });

        return response()->json(['users' => $users]);
    }

    /**
     * Mark onboarding as completed for the current user
     */
    public function markOnboardingComplete(Request $request)
    {
        $user = $request->user();
        $user->onboarding_completed = true;
        $user->save();

        return response()->json([
            'message' => 'Onboarding marked as complete',
            'onboarding_completed' => true
        ]);
    }

    /**
     * Reset onboarding status to show tour again
     */
    public function resetOnboarding(Request $request)
    {
        $user = $request->user();
        $user->onboarding_completed = false;
        $user->save();

        return response()->json([
            'message' => 'Onboarding reset successfully',
            'onboarding_completed' => false
        ]);
    }
}
