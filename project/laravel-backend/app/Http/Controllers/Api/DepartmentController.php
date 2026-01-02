<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DepartmentController extends Controller
{
    /**
     * Get all departments
     */
    public function index()
    {
        $departments = Department::withCount(['users', 'tasks'])->get();
        return response()->json($departments);
    }

    /**
     * Get a single department by ID
     */
    public function show($id)
    {
        $department = Department::withCount(['users', 'tasks'])->findOrFail($id);
        return response()->json($department);
    }

    /**
     * Public lightweight department list for registration dropdown
     */
    public function publicList()
    {
        $departments = Department::select('id', 'name')->orderBy('name')->get();
        return response()->json(['data' => $departments]);
    }

    /**
     * Create a new department
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Only super admins can create departments'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:departments',
            'description' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $department = Department::create($request->all());

        return response()->json([
            'message' => 'Department created successfully',
            'department' => $department,
        ], 201);
    }

    /**
     * Update a department
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Only super admins can update departments'], 403);
        }

        $department = Department::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:100|unique:departments,name,' . $id,
            'description' => 'sometimes|nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $department->update($request->all());

        return response()->json([
            'message' => 'Department updated successfully',
            'department' => $department,
        ]);
    }

    /**
     * Delete a department
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isSuperAdmin()) {
            return response()->json(['message' => 'Only super admins can delete departments'], 403);
        }

        $department = Department::findOrFail($id);

        // Check if department has users or tasks
        if ($department->users()->count() > 0 || $department->tasks()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete department with existing users or tasks',
            ], 422);
        }

        $department->delete();

        return response()->json([
            'message' => 'Department deleted successfully',
        ]);
    }

    /**
     * Get department statistics
     */
    public function statistics($id)
    {
        $department = Department::findOrFail($id);

        $stats = [
            'total_users' => $department->users()->count(),
            'active_users' => $department->users()->where('status', 'active')->count(),
            'total_tasks' => $department->tasks()->count(),
            'completed_tasks' => $department->tasks()->completed()->count(),
            'in_progress_tasks' => $department->tasks()->where('status', 'in-progress')->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Get employees for a department
     */
    public function employees(Request $request, $id)
    {
        $user = $request->user();

        $department = Department::findOrFail($id);

        // Permission checks:
        // - Super admins can view all departments
        // - Dept admins can view employees of departments they manage or their own department
        // - Employees can only view employees of their own department
        
        if ($user->isDeptAdmin()) {
            $manages = $user->managesDepartment($department->name);
            $sameDept = (int)$user->department_id === (int)$id;
            if (!$manages && !$sameDept) {
                return response()->json(['message' => 'Unauthorized: You do not manage this department'], 403);
            }
        }

        // Employees can only view employees from their own department
        if ($user->isEmployee()) {
            if (!$user->department_id) {
                return response()->json(['message' => 'Unauthorized: You are not assigned to any department'], 403);
            }
            if ((int)$user->department_id !== (int)$id) {
                return response()->json(['message' => 'Unauthorized: You can only view employees from your own department'], 403);
            }
        }

        // For Administration department, get all users (admins)
        // For other departments, only get employees
        if ($department->name === 'Administration') {
            $query = $department->users();
        } else {
            $query = $department->users()->where('role', 'employee');
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Optional simple search by name/email
        if ($request->has('q')) {
            $q = '%' . $request->q . '%';
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', $q)
                    ->orWhere('email', 'like', $q)
                    ->orWhere('username', 'like', $q);
            });
        }

        $employees = $query->orderBy('name')->paginate($request->get('per_page', 20));

        return response()->json($employees);
    }
}
