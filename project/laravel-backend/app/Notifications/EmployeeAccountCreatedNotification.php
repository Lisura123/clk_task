<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmployeeAccountCreatedNotification extends Notification
{
    use Queueable;

    protected $credentials;
    protected $creatorName;

    /**
     * Create a new notification instance.
     */
    public function __construct($credentials, $creatorName)
    {
        $this->credentials = $credentials;
        $this->creatorName = $creatorName;
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
            ->subject('Your Employee Account Has Been Created - CLK Task Management')
            ->greeting('Hello ' . $notifiable->name . '!')
            ->line('Your employee account has been created by ' . $this->creatorName . '.')
            ->line('Your account is now active and ready to use. Here are your login credentials:')
            ->line('**Username:** ' . $this->credentials['username'])
            ->line('**Email:** ' . $this->credentials['email'])
            ->line('**Password:** ' . $this->credentials['password'])
            ->line('**Department:** ' . $this->credentials['department'])
            ->line('**Role:** ' . ucfirst($this->credentials['role']))
            ->action('Login Now', url('/login'))
            ->line('**Important:** Please keep these credentials secure. We recommend changing your password after your first login.')
            ->line('If you have any questions, please contact your administrator.')
            ->line('Welcome to the team!');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'creator_name' => $this->creatorName,
            'username' => $this->credentials['username'],
        ];
    }
}
