<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAttendanceRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles  Allowed attendance roles: admin_procurement, finance, branch_employee
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // System admins always have access
        if ($user->isAdmin()) {
            return $next($request);
        }

        // Check if user has any of the allowed attendance roles
        $userAttendanceRole = $user->attendance_role;

        if (empty($roles)) {
            // No specific role required, just need to be authenticated
            return $next($request);
        }

        foreach ($roles as $role) {
            if ($this->checkRole($user, $role)) {
                return $next($request);
            }
        }

        return response()->json([
            'message' => 'You do not have permission to access this resource.',
            'required_roles' => $roles,
            'your_role' => $userAttendanceRole,
        ], 403);
    }

    /**
     * Check if user has a specific attendance role
     */
    private function checkRole($user, string $role): bool
    {
        return match ($role) {
            'admin_procurement', 'admin' => $user->isAttendanceAdmin(),
            'finance' => $user->isAttendanceFinance(),
            'branch_employee', 'employee' => $user->isAttendanceBranchEmployee(),
            'any' => $user->hasAttendanceAccess(),
            'can_mark' => $user->canMarkGpsAttendance(),
            'can_view_reports' => $user->canViewAttendanceReports(),
            'can_manage' => $user->canManageAttendance(),
            default => false,
        };
    }
}
