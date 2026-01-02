<?php

namespace App\Notifications;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskAssignedNotification extends Notification
{
    use Queueable;

    protected $task;
    protected $assignedBy;

    /**
     * Create a new notification instance.
     */
    public function __construct(Task $task, User $assignedBy)
    {
        $this->task = $task;
        $this->assignedBy = $assignedBy;
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
        $priorityColor = match($this->task->priority) {
            'high' => '🔴 High',
            'medium' => '🟡 Medium',
            'low' => '🟢 Low',
            default => $this->task->priority
        };

        $message = (new MailMessage)
            ->subject('New Task Assigned: ' . $this->task->title . ' - CLK Task Management')
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('You have been assigned a new task by ' . $this->assignedBy->name . '.')
            ->line('---')
            ->line('**Task Details:**')
            ->line('**Title:** ' . $this->task->title)
            ->line('**Priority:** ' . $priorityColor)
            ->line('**Department:** ' . $this->task->department);

        if ($this->task->description) {
            $message->line('**Description:** ' . $this->task->description);
        }

        if ($this->task->due_date) {
            $message->line('**Due Date:** ' . $this->task->due_date->format('F j, Y'));
        }

        $message->line('---')
            ->action('View Task', url('/dashboard/tasks/' . $this->task->id))
            ->line('Please log in to view the complete task details and start working on it.')
            ->line('If you have any questions, please contact your supervisor.');

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
            'assigned_by' => $this->assignedBy->name,
        ];
    }
}
