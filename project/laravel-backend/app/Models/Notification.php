<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Http\Controllers\Api\WebPushController;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'triggered_by_id',
        'type',
        'title',
        'message',
        'task_id',
        'read_status',
    ];

    protected $casts = [
        'read_status' => 'boolean',
    ];

    /**
     * Boot the model
     */
    protected static function booted()
    {
        static::created(function ($notification) {
            // Send web push notification when a notification is created
            try {
                WebPushController::sendToUser($notification->user_id, [
                    'title' => $notification->title ?? 'New Notification',
                    'body' => $notification->message ?? '',
                    'icon' => '/favicon.svg',
                    'badge' => '/favicon.svg',
                    'tag' => 'notification-' . $notification->id,
                    'data' => [
                        'notification_id' => $notification->id,
                        'task_id' => $notification->task_id,
                        'type' => $notification->type,
                        'url' => $notification->task_id 
                            ? '/dashboard/tasks/' . $notification->task_id 
                            : '/dashboard/notifications'
                    ]
                ]);
            } catch (\Exception $e) {
                \Log::debug('Web push failed: ' . $e->getMessage());
            }
        });
    }

    /**
     * Get the user who receives this notification
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who triggered this notification
     */
    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by_id');
    }

    /**
     * Get the task related to this notification
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Scope for unread notifications
     */
    public function scopeUnread($query)
    {
        return $query->where('read_status', false);
    }

    /**
     * Scope for read notifications
     */
    public function scopeRead($query)
    {
        return $query->where('read_status', true);
    }

    /**
     * Scope for notifications by type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Mark as read
     */
    public function markAsRead()
    {
        $this->update(['read_status' => true]);
    }

    /**
     * Mark as unread
     */
    public function markAsUnread()
    {
        $this->update(['read_status' => false]);
    }
}
