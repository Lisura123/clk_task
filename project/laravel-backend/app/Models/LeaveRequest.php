<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class LeaveRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'leave_type_id',
        'department_id',
        'start_date',
        'end_date',
        'total_days',
        'start_half',
        'end_half',
        'reason',
        'contact_phone',
        'days_note',
        'attachment_path',
        'status',
        'hod_approved_by',
        'hod_approved_at',
        'hod_notes',
        'admin_approved_by',
        'admin_approved_at',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'admin_notes',
        'emergency_contact',
        'emergency_phone',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'total_days' => 'decimal:1',
        'approved_at' => 'datetime',
        'hod_approved_at' => 'datetime',
        'admin_approved_at' => 'datetime',
    ];

    protected $appends = ['status_color', 'duration_text', 'status_label', 'requires_admin_approval'];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function hodApprovedBy()
    {
        return $this->belongsTo(User::class, 'hod_approved_by');
    }

    public function adminApprovedBy()
    {
        return $this->belongsTo(User::class, 'admin_approved_by');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->whereIn('status', ['pending', 'hod_approved']);
    }

    public function scopePendingHod($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopePendingAdmin($query)
    {
        return $query->where('status', 'hod_approved');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    public function scopeForYear($query, $year)
    {
        return $query->whereYear('start_date', $year);
    }

    public function scopeOverlapping($query, $startDate, $endDate, $excludeId = null)
    {
        $query->where(function ($q) use ($startDate, $endDate) {
            $q->whereBetween('start_date', [$startDate, $endDate])
              ->orWhereBetween('end_date', [$startDate, $endDate])
              ->orWhere(function ($q2) use ($startDate, $endDate) {
                  $q2->where('start_date', '<=', $startDate)
                     ->where('end_date', '>=', $endDate);
              });
        })->whereIn('status', ['pending', 'hod_approved', 'approved']);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query;
    }

    // Accessors
    public function getStatusColorAttribute()
    {
        return match($this->status) {
            'pending' => 'yellow',
            'hod_approved' => 'blue',
            'approved' => 'green',
            'rejected' => 'red',
            'cancelled' => 'gray',
            default => 'gray',
        };
    }

    public function getStatusLabelAttribute()
    {
        // For Procurement employees with pending status, show "Pending Admin Approval" since they skip HOD
        if ($this->status === 'pending' && $this->user && $this->user->isHR()) {
            return 'Pending Admin Approval';
        }
        
        return match($this->status) {
            'pending' => 'Pending HOD Approval',
            'hod_approved' => 'Pending Admin Approval',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'cancelled' => 'Cancelled',
            default => ucfirst($this->status),
        };
    }

    public function getRequiresAdminApprovalAttribute()
    {
        // Procurement employees go directly to admin (skip HOD)
        if ($this->user && $this->user->isHR()) {
            return true;
        }
        
        // Check if the requester is an employee or senior_employee (needs both HOD and Admin approval)
        return $this->user && in_array($this->user->role, ['employee', 'senior_employee']);
    }

    public function getDurationTextAttribute()
    {
        if ($this->total_days == 0.5) {
            return 'Half Day';
        } elseif ($this->total_days == 1) {
            return '1 Day';
        } else {
            return $this->total_days . ' Days';
        }
    }

    // Helper methods
    public static function calculateDays($startDate, $endDate, $startHalf = 'full', $endHalf = 'full')
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        
        // Get holidays in range
        $holidays = Holiday::whereBetween('date', [$start, $end])
            ->where('is_active', true)
            ->pluck('date')
            ->map(fn($d) => Carbon::parse($d)->format('Y-m-d'))
            ->toArray();

        $days = 0;
        $current = $start->copy();

        while ($current <= $end) {
            // Skip weekends (Saturday = 6, Sunday = 0)
            if ($current->dayOfWeek !== 0 && $current->dayOfWeek !== 6) {
                // Skip holidays
                if (!in_array($current->format('Y-m-d'), $holidays)) {
                    if ($current->isSameDay($start) && $startHalf !== 'full') {
                        $days += 0.5;
                    } elseif ($current->isSameDay($end) && $endHalf !== 'full') {
                        $days += 0.5;
                    } else {
                        $days += 1;
                    }
                }
            }
            $current->addDay();
        }

        return $days;
    }

    /**
     * Check if this request needs HOD approval first
     */
    public function needsHodApproval()
    {
        // HR department employees skip HOD approval - go directly to admin
        if ($this->user && $this->user->isHR()) {
            return false;
        }
        
        // Employee and Senior Employee requests need HOD approval first
        return $this->user && in_array($this->user->role, ['employee', 'senior_employee']) && $this->status === 'pending';
    }

    /**
     * Check if this request needs admin approval
     */
    public function needsAdminApproval()
    {
        // HR department employees go directly to admin (pending status)
        if ($this->user && $this->user->isHR()) {
            return $this->status === 'pending';
        }
        
        // Employee and Senior Employee requests that HOD approved need admin approval
        if ($this->user && in_array($this->user->role, ['employee', 'senior_employee'])) {
            return $this->status === 'hod_approved';
        }
        // HOD requests go directly to admin
        if ($this->user && $this->user->role === 'hod') {
            return $this->status === 'pending';
        }
        return false;
    }

    /**
     * HOD approves the leave request (first level for employees)
     */
    public function approveByHod($hodId, $notes = null)
    {
        $this->status = 'hod_approved';
        $this->hod_approved_by = $hodId;
        $this->hod_approved_at = now();
        $this->hod_notes = $notes;
        $this->save();

        // Notify the employee
        Notification::create([
            'user_id' => $this->user_id,
            'type' => 'leave_hod_approved',
            'title' => 'Leave Request Approved by HOD',
            'message' => "Your {$this->leaveType->name} request has been approved by your HOD and is now pending final admin approval.",
            'read_status' => 0,
        ]);

        // Notify super admins for final approval
        $superAdmins = User::where('role', 'admin')->get();
        foreach ($superAdmins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'leave_pending_admin',
                'title' => 'Leave Request Pending Your Approval',
                'message' => "{$this->user->name}'s {$this->leaveType->name} request ({$this->total_days} days) has been approved by HOD and requires your final approval.",
                'read_status' => 0,
            ]);
        }

        return $this;
    }

    /**
     * Admin gives final approval
     */
    public function approveByAdmin($adminId, $notes = null)
    {
        $this->status = 'approved';
        $this->admin_approved_by = $adminId;
        $this->admin_approved_at = now();
        $this->approved_by = $adminId;
        $this->approved_at = now();
        $this->admin_notes = $notes;
        $this->save();

        // Update leave balance
        $balance = LeaveBalance::where('user_id', $this->user_id)
            ->where('leave_type_id', $this->leave_type_id)
            ->where('year', $this->start_date->year)
            ->first();

        if ($balance) {
            $balance->pending_days -= $this->total_days;
            $balance->used_days += $this->total_days;
            $balance->save();
        }

        // Create notification
        Notification::create([
            'user_id' => $this->user_id,
            'type' => 'leave_approved',
            'title' => 'Leave Request Fully Approved',
            'message' => "Your {$this->leaveType->name} request from {$this->start_date->format('M d')} to {$this->end_date->format('M d, Y')} has been fully approved.",
            'read_status' => 0,
        ]);

        return $this;
    }

    /**
     * Legacy approve method - routes to appropriate approval method
     */
    public function approve($approverId, $notes = null)
    {
        $approver = User::find($approverId);
        
        if (!$approver) {
            return $this;
        }

        // If approver is super_admin
        if ($approver->role === 'admin') {
            return $this->approveByAdmin($approverId, $notes);
        }
        
        // If approver is dept_admin (HOD)
        if ($approver->role === 'hod') {
            // If this is an employee's or senior_employee's request, HOD gives first approval
            if (in_array($this->user->role, ['employee', 'senior_employee']) && $this->status === 'pending') {
                return $this->approveByHod($approverId, $notes);
            }
        }

        return $this;
    }

    public function reject($approverId, $reason, $notes = null)
    {
        $approver = User::find($approverId);
        $previousStatus = $this->status;
        
        $this->status = 'rejected';
        $this->approved_by = $approverId;
        $this->approved_at = now();
        $this->rejection_reason = $reason;
        $this->admin_notes = $notes;
        $this->save();

        // Release pending days back to balance
        $balance = LeaveBalance::where('user_id', $this->user_id)
            ->where('leave_type_id', $this->leave_type_id)
            ->where('year', $this->start_date->year)
            ->first();

        if ($balance) {
            $balance->pending_days -= $this->total_days;
            $balance->save();
        }

        // Create notification
        $rejectedBy = $approver->role === 'admin' ? 'Admin' : 'HOD';
        Notification::create([
            'user_id' => $this->user_id,
            'type' => 'leave_rejected',
            'title' => "Leave Request Rejected by {$rejectedBy}",
            'message' => "Your {$this->leaveType->name} request from {$this->start_date->format('M d')} to {$this->end_date->format('M d, Y')} has been rejected. Reason: {$reason}",
            'read_status' => 0,
        ]);

        return $this;
    }

    public function cancel()
    {
        $previousStatus = $this->status;
        
        if (in_array($this->status, ['pending', 'hod_approved'])) {
            // Release pending days
            $balance = LeaveBalance::where('user_id', $this->user_id)
                ->where('leave_type_id', $this->leave_type_id)
                ->where('year', $this->start_date->year)
                ->first();

            if ($balance) {
                $balance->pending_days -= $this->total_days;
                $balance->save();
            }
        } elseif ($this->status === 'approved') {
            // Return used days
            $balance = LeaveBalance::where('user_id', $this->user_id)
                ->where('leave_type_id', $this->leave_type_id)
                ->where('year', $this->start_date->year)
                ->first();

            if ($balance) {
                $balance->used_days -= $this->total_days;
                $balance->save();
            }
        }

        $this->status = 'cancelled';
        $this->save();

        // Notify relevant approvers about cancellation
        $this->notifyCancellation($previousStatus);

        return $this;
    }

    /**
     * Notify approvers when a leave request is cancelled
     */
    private function notifyCancellation($previousStatus)
    {
        $this->load(['user', 'leaveType']);
        
        // Get HR department ID
        $hrDeptId = Department::where('name', 'HR')->value('id') ?? 12;
        $isHR = $this->department_id == $hrDeptId;
        
        $notifyUsers = collect();
        
        if ($previousStatus === 'pending') {
            // Notify whoever would have received the request
            if ($this->user->role === 'hod' || $isHR) {
                // Would have gone to admins
                $notifyUsers = User::where('role', 'admin')->get();
            } else {
                // Would have gone to HOD
                $notifyUsers = User::where('role', 'hod')
                    ->where(function ($q) {
                        $q->whereJsonContains('managed_department_ids', $this->department_id)
                          ->orWhere('department_id', $this->department_id);
                    })->get();
            }
        } elseif ($previousStatus === 'hod_approved') {
            // Was waiting for admin approval - notify admins
            $notifyUsers = User::where('role', 'admin')->get();
        } elseif ($previousStatus === 'approved') {
            // Was already approved - notify both HOD (if applicable) and admins
            $admins = User::where('role', 'admin')->get();
            
            if (!$isHR && $this->user->role !== 'hod') {
                $hods = User::where('role', 'hod')
                    ->where(function ($q) {
                        $q->whereJsonContains('managed_department_ids', $this->department_id)
                          ->orWhere('department_id', $this->department_id);
                    })->get();
                $notifyUsers = $admins->merge($hods);
            } else {
                $notifyUsers = $admins;
            }
        }
        
        foreach ($notifyUsers as $notifyUser) {
            Notification::create([
                'user_id' => $notifyUser->id,
                'type' => 'leave_cancelled',
                'title' => 'Leave Request Cancelled',
                'message' => "{$this->user->name} has cancelled their {$this->leaveType->name} request for {$this->start_date->format('M d')} to {$this->end_date->format('M d, Y')} ({$this->total_days} day(s)).",
                'read_status' => 0,
            ]);
        }
    }
}