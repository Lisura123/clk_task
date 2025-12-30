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
        $query = User::with('departmentRelation');

        // Filter by managed departments for dept admin
        if ($user->isDeptAdmin()) {
            $managedDeptIds = $user->managed_department_ids ?? [];
            if (!empty($managedDeptIds)) {
                $query->whereIn('department_id', $managedDeptIds);
            } else {
                // If no managed departments, return empty result
                $query->whereRaw('1 = 0');
            }
        }

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
        
        // Add department_name to each user for easier frontend access
        $users->getCollection()->transform(function ($user) {
            $user->department_name = $user->departmentRelation?->name ?? $user->department ?? null;
            return $user;
        });

        return response()->json($users);
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
            $query->whereIn('department', $managedDepts);
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

        $targetUser->update(['status' => 'active']);

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
            'role' => 'required|in:employee,dept_admin',
            'phone' => 'nullable|string|max:20',
            'managed_department_ids' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check if dept admin can create user in this department
        if ($user->isDeptAdmin() && !$user->managesDepartment($request->department)) {
            return response()->json(['message' => 'You cannot create users for this department'], 403);
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

        // Send email notification with login credentials
        try {
            $credentials = [
                'username' => $request->username,
                'email' => $request->email,
                'password' => $request->password, // Plain text password for email
                'department' => $request->department,
                'role' => $request->role,
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
        $user = $request->user();
        $targetUser = User::findOrFail($id);

        if ($user->isEmployee()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->isDeptAdmin() && !$user->managesDepartment($targetUser->department)) {
            return response()->json(['message' => 'You cannot update users from this department'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'username' => 'sometimes|string|max:50|unique:users,username,' . $id,
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'sometimes|nullable|string|min:8',
            'department' => 'sometimes|string|max:100',
            'department_id' => 'sometimes|exists:departments,id',
            'role' => 'sometimes|in:employee,dept_admin,super_admin',
            'phone' => 'sometimes|nullable|string|max:20',
            'phone_number' => 'sometimes|nullable|string|max:20',
            'status' => 'sometimes|in:pending,active,inactive',
            'managed_department_ids' => 'sometimes|nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Dept admins cannot change roles to super_admin
        if ($user->isDeptAdmin() && $request->has('role') && $request->role === 'super_admin') {
            return response()->json(['message' => 'You cannot assign super admin role'], 403);
        }

        // Handle department_id to department name conversion
        $updateData = $request->all();
        
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
        
        // Hash password if provided
        if ($request->has('password') && $request->password) {
            $updateData['password'] = Hash::make($request->password);
        } else {
            unset($updateData['password']);
        }

        $targetUser->update($updateData);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $targetUser,
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
        $targetUser = User::findOrFail($id);

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
        $query = User::select('id', 'name', 'email', 'role', 'department')
            ->where('status', 'active');

        // Filter by department for dept admins
        if ($user->isDeptAdmin()) {
            $managedDepts = $user->managed_department_ids ?? [];
            $query->whereIn('department', $managedDepts);
        }

        $users = $query->get()->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'department' => $u->department,
            ];
        });

        return response()->json(['users' => $users]);
    }
}
