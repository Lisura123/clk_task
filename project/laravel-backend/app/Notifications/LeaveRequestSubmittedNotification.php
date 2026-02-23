<?php

namespace App\Notifications;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LeaveRequestSubmittedNotification extends Notification
{
    use Queueable;

    protected $leaveRequest;
    protected $recipientType; // 'hod' or 'admin'

    /**
     * Create a new notification instance.
     */
    public function __construct(LeaveRequest $leaveRequest, string $recipientType = 'hod')
    {
        $this->leaveRequest = $leaveRequest;
        $this->recipientType = $recipientType;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        // Always send email for leave requests to HOD and Admin
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        $leaveRequest = $this->leaveRequest;
        $employee = $leaveRequest->user;
        $leaveType = $leaveRequest->leaveType;
        $department = $leaveRequest->department;

        $startDate = $leaveRequest->start_date->format('F j, Y');
        $endDate = $leaveRequest->end_date->format('F j, Y');
        
        // Determine the subject based on recipient type
        $subjectPrefix = $this->recipientType === 'admin' ? '[Admin Action Required]' : '[HOD Action Required]';
        $subject = "{$subjectPrefix} Leave Request from {$employee->name} - CLK Task Management";

        $message = (new MailMessage)
            ->subject($subject)
            ->greeting('Hello ' . $notifiable->name . '!');

        // Add context based on recipient type
        if ($this->recipientType === 'admin') {
            $message->line('A new leave request requires your attention and approval.');
        } else {
            $message->line('A team member has submitted a leave request that requires your review.');
        }

        $message->line('---')
            ->line('**Leave Request Details:**')
            ->line('**Employee:** ' . $employee->name)
            ->line('**Department:** ' . ($department ? $department->name : 'N/A'))
            ->line('**Leave Type:** ' . $leaveType->name)
            ->line('**Duration:** ' . $leaveRequest->total_days . ' day(s)')
            ->line('**Start Date:** ' . $startDate)
            ->line('**End Date:** ' . $endDate);

        // Add half-day info if applicable
        if ($leaveRequest->start_half !== 'full' || $leaveRequest->end_half !== 'full') {
            $halfDayInfo = [];
            if ($leaveRequest->start_half !== 'full') {
                $halfDayInfo[] = 'Start: ' . ucfirst(str_replace('_', ' ', $leaveRequest->start_half));
            }
            if ($leaveRequest->end_half !== 'full') {
                $halfDayInfo[] = 'End: ' . ucfirst(str_replace('_', ' ', $leaveRequest->end_half));
            }
            $message->line('**Half-day Info:** ' . implode(', ', $halfDayInfo));
        }

        $message->line('**Reason:** ' . $leaveRequest->reason);

        // Add emergency contact if provided
        if ($leaveRequest->emergency_contact) {
            $message->line('**Emergency Contact:** ' . $leaveRequest->emergency_contact . 
                          ($leaveRequest->emergency_phone ? ' (' . $leaveRequest->emergency_phone . ')' : ''));
        }

        // Add attachment info
        if ($leaveRequest->attachment_path) {
            $message->line('**Attachment:** Document attached (view in dashboard)');
        }

        $message->line('---')
            ->action('Review Leave Request', url('/dashboard/leave-requests/' . $leaveRequest->id))
            ->line('Please log in to the dashboard to approve or reject this request.')
            ->line('Thank you for your attention to this matter.');

        return $message;
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'leave_request_id' => $this->leaveRequest->id,
            'employee_name' => $this->leaveRequest->user->name,
            'leave_type' => $this->leaveRequest->leaveType->name,
            'total_days' => $this->leaveRequest->total_days,
            'start_date' => $this->leaveRequest->start_date->toDateString(),
            'end_date' => $this->leaveRequest->end_date->toDateString(),
            'status' => $this->leaveRequest->status,
        ];
    }
}
