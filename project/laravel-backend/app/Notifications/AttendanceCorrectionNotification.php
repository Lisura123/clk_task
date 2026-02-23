<?php

namespace App\Notifications;

use App\Models\AttendanceCorrection;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AttendanceCorrectionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected AttendanceCorrection $correction;
    protected string $action;

    /**
     * Create a new notification instance.
     */
    public function __construct(AttendanceCorrection $correction, string $action)
    {
        $this->correction = $correction;
        $this->action = $action;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $subject = match ($this->action) {
            'submitted' => 'Attendance Correction Request Submitted',
            'approved' => 'Attendance Correction Request Approved',
            'rejected' => 'Attendance Correction Request Rejected',
            default => 'Attendance Correction Update',
        };

        $message = match ($this->action) {
            'submitted' => "Your attendance correction request for {$this->correction->attendance->date->format('M d, Y')} has been submitted and is pending review.",
            'approved' => "Your attendance correction request for {$this->correction->attendance->date->format('M d, Y')} has been approved.",
            'rejected' => "Your attendance correction request for {$this->correction->attendance->date->format('M d, Y')} has been rejected.",
            default => "Your attendance correction request has been updated.",
        };

        $mailMessage = (new MailMessage)
            ->subject($subject)
            ->greeting("Hello {$notifiable->name},")
            ->line($message);

        if ($this->action === 'approved') {
            $mailMessage->line("Correction Type: " . ucfirst(str_replace('_', ' ', $this->correction->correction_type)));

            if ($this->correction->requested_check_in) {
                $mailMessage->line("New Check-in Time: " . $this->correction->requested_check_in->format('h:i A'));
            }
            if ($this->correction->requested_check_out) {
                $mailMessage->line("New Check-out Time: " . $this->correction->requested_check_out->format('h:i A'));
            }
        }

        if ($this->action === 'rejected' && $this->correction->review_notes) {
            $mailMessage->line("Reason: {$this->correction->review_notes}");
        }

        return $mailMessage
            ->action('View Attendance History', url('/attendance'))
            ->line('Thank you for using CLK Task!');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'attendance_correction',
            'action' => $this->action,
            'correction_id' => $this->correction->id,
            'attendance_id' => $this->correction->attendance_id,
            'attendance_date' => $this->correction->attendance->date->format('Y-m-d'),
            'correction_type' => $this->correction->correction_type,
            'status' => $this->correction->status,
            'review_notes' => $this->correction->review_notes,
            'message' => match ($this->action) {
                'submitted' => "Your correction request for {$this->correction->attendance->date->format('M d, Y')} is pending review.",
                'approved' => "Your correction request for {$this->correction->attendance->date->format('M d, Y')} was approved.",
                'rejected' => "Your correction request for {$this->correction->attendance->date->format('M d, Y')} was rejected.",
                default => "Your correction request has been updated.",
            },
        ];
    }
}
