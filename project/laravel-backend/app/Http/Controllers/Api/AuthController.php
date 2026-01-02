<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Notification;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Notifications\ResetPasswordNotification;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:50|unique:users',
            'email' => 'required|string|email|max:100|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'department' => 'required|string|max:100',
            'phone' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'username' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'department' => $request->department,
            'phone' => $request->phone,
            'role' => 'employee',
            'status' => 'pending', // Requires admin approval
        ]);

        // Notify all super admins and dept admins of the department about new registration
        // First, find the department ID from the department name
        $department = Department::where('name', $request->department)->first();
        $departmentId = $department ? $department->id : null;
        
        // Get super admins
        $superAdmins = User::where('role', 'super_admin')
            ->where('status', 'active')
            ->get();
        
        // Get HODs who manage this department
        $hodAdmins = collect();
        if ($departmentId) {
            $hodAdmins = User::where('role', 'dept_admin')
                ->where('status', 'active')
                ->whereNotNull('managed_department_ids')
                ->get()
                ->filter(function($admin) use ($departmentId) {
                    $managedDepts = $admin->managed_department_ids;
                    if (is_string($managedDepts)) {
                        $managedDepts = json_decode($managedDepts, true);
                    }
                    return is_array($managedDepts) && in_array($departmentId, $managedDepts);
                });
        }
        
        // Merge and deduplicate admins
        $admins = $superAdmins->merge($hodAdmins)->unique('id');

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'triggered_by_id' => $user->id,
                'type' => 'new_registration',
                'title' => 'New User Registration',
                'message' => "{$user->name} has registered for {$request->department} and is awaiting approval.",
                'task_id' => null,
            ]);
        }

        return response()->json([
            'message' => 'Registration successful. Please wait for admin approval.',
            'user' => $user,
        ], 201);
    }

    /**
     * Login user
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'message' => 'Your account is not active. Please contact administrator.',
            ], 403);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get current user
     */
    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('departmentRelation'),
        ]);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:100|unique:users,email,' . $user->id,
            'phone' => 'sometimes|nullable|string|max:20',
            'profile_picture' => 'sometimes|nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->update($request->only(['name', 'email', 'phone', 'profile_picture']));

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->fresh()->load('departmentRelation'),
        ]);
    }

    /**
     * Change password
     */
    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect',
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }

    /**
     * Send password reset link
     */
    public function forgotPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'We could not find a user with that email address.',
            ], 404);
        }

        // Delete any existing tokens for this user
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        // Create new token
        $token = Str::random(60);
        
        DB::table('password_reset_tokens')->insert([
            'email' => $request->email,
            'token' => Hash::make($token),
            'created_at' => now(),
        ]);

        // Send password reset email
        try {
            $user->notify(new ResetPasswordNotification($token, $request->email));
        } catch (\Exception $e) {
            \Log::error('Failed to send password reset email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Password reset link has been sent to your email.',
        ]);
    }

    /**
     * Reset password using token
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Get the token record
        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$resetRecord) {
            return response()->json([
                'message' => 'Invalid or expired reset token.',
            ], 400);
        }

        // Check if token matches
        if (!Hash::check($request->token, $resetRecord->token)) {
            return response()->json([
                'message' => 'Invalid reset token.',
            ], 400);
        }

        // Check if token is expired (60 minutes)
        if (now()->diffInMinutes($resetRecord->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'message' => 'Reset token has expired. Please request a new one.',
            ], 400);
        }

        // Update password
        $user = User::where('email', $request->email)->first();
        $user->update([
            'password' => Hash::make($request->password),
        ]);

        // Delete the token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'message' => 'Password has been reset successfully. You can now log in with your new password.',
        ]);
    }

    /**
     * Update notification preferences
     */
    public function updateNotificationPreferences(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'email_notifications' => 'sometimes|boolean',
            'task_reminders' => 'sometimes|boolean',
            'comment_notifications' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->update($request->only(['email_notifications', 'task_reminders', 'comment_notifications']));

        return response()->json([
            'message' => 'Notification preferences updated successfully',
            'user' => $user->fresh(),
        ]);
    }
}
