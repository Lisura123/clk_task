<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RegistrationApprovedNotification extends Notification
{
    use Queueable;

    protected $approverName;

    /**
     * Create a new notification instance.
     */
    public function __construct($approverName)
    {
        $this->approverName = $approverName;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Registration Approved - CLK Task Management')
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('Great news! Your registration has been approved by ' . $this->approverName . '.')
            ->line('You can now login to the Task Management System using your credentials.')
            ->action('Login Now', url('/login'))
            ->line('If you have forgotten your password, you can reset it using the "Forgot Password" option on the login page.')
            ->line('Thank you for joining our team!');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'approver_name' => $this->approverName,
        ];
    }
}
