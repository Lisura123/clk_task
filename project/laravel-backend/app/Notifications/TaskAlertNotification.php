<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskAlertNotification extends Notification
{
    use Queueable;

    protected $task;
    protected $alertType;
    protected $timeInfo;

    /**
     * Create a new notification instance.
     * 
     * @param Task $task The task that triggered the alert
     * @param string $alertType Either 'deadline' or 'overdue'
     * @param int $timeInfo Hours remaining (deadline) or days overdue (overdue)
     */
    public function __construct(Task $task, string $alertType, int $timeInfo)
    {
        $this->task = $task;
        $this->alertType = $alertType;
        $this->timeInfo = $timeInfo;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        // Only send email if user has email notifications enabled
        if ($notifiable->email_notifications) {
            return ['mail'];
        }
        return [];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        if ($this->alertType === 'deadline') {
            return $this->buildDeadlineEmail($notifiable);
        } else {
            return $this->buildOverdueEmail($notifiable);
        }
    }

    /**
     * Build email for deadline approaching alert
     */
    private function buildDeadlineEmail($notifiable): MailMessage
    {
        $priorityEmoji = match($this->task->priority) {
            'high' => '🔴',
            'medium' => '🟡',
            'low' => '🟢',
            default => '⚪'
        };

        $urgencyEmoji = $this->timeInfo <= 24 ? '⏰' : '📅';

        $message = (new MailMessage)
            ->subject("{$urgencyEmoji} Task Deadline Approaching: {$this->task->title}")
            ->greeting("Hello {$notifiable->name}!")
            ->line("⚠️ **This is a reminder that your task is due soon!**")
            ->line('---')
            ->line("**Task:** {$this->task->title}")
            ->line("**Priority:** {$priorityEmoji} " . ucfirst($this->task->priority))
            ->line("**Department:** {$this->task->department}")
            ->line("**Time Remaining:** {$this->timeInfo} hours");

        if ($this->task->due_date) {
            $message->line("**Due Date:** " . $this->task->due_date->format('F j, Y g:i A'));
        }

        if ($this->task->description) {
            $description = strlen($this->task->description) > 150 
                ? substr($this->task->description, 0, 150) . '...' 
                : $this->task->description;
            $message->line("**Description:** {$description}");
        }

        $message->line('---')
            ->action('View Task', url('/dashboard/tasks/' . $this->task->id))
            ->line('Please ensure you complete this task before the deadline.')
            ->line('If you need more time or assistance, contact your supervisor immediately.');

        return $message;
    }

    /**
     * Build email for overdue task alert
     */
    private function buildOverdueEmail($notifiable): MailMessage
    {
        $priorityEmoji = match($this->task->priority) {
            'high' => '🔴',
            'medium' => '🟡',
            'low' => '🟢',
            default => '⚪'
        };

        $daysText = $this->timeInfo === 1 ? 'day' : 'days';

        $message = (new MailMessage)
            ->subject("🚨 OVERDUE Task: {$this->task->title}")
            ->greeting("Hello {$notifiable->name}!")
            ->line("🚨 **URGENT: Your task is overdue!**")
            ->line('---')
            ->line("**Task:** {$this->task->title}")
            ->line("**Priority:** {$priorityEmoji} " . ucfirst($this->task->priority))
            ->line("**Department:** {$this->task->department}")
            ->line("**Overdue By:** {$this->timeInfo} {$daysText}");

        if ($this->task->due_date) {
            $message->line("**Original Due Date:** " . $this->task->due_date->format('F j, Y'));
        }

        if ($this->task->description) {
            $description = strlen($this->task->description) > 150 
                ? substr($this->task->description, 0, 150) . '...' 
                : $this->task->description;
            $message->line("**Description:** {$description}");
        }

        $message->line('---')
            ->action('Complete Task Now', url('/dashboard/tasks/' . $this->task->id))
            ->line('⚠️ **Please complete this task immediately or contact your supervisor to discuss.**')
            ->line('Overdue tasks affect team performance metrics.');

        return $message;
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'task_id' => $this->task->id,
            'task_title' => $this->task->title,
            'alert_type' => $this->alertType,
            'time_info' => $this->timeInfo,
        ];
    }
}
