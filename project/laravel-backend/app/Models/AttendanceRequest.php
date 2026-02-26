<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'date',
        'in_time',
        'out_time',
        'reason_type',
        'reason',
        'location',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'synced_to_attendance',
    ];

    protected $casts = [
        'date' => 'date',
        'reviewed_at' => 'datetime',
        'synced_to_attendance' => 'boolean',
    ];

    /**
     * Reason type constants
     */
    const REASON_CLIENT_VISIT = 'client_visit';
    const REASON_FIELD_WORK = 'field_work';
    const REASON_TRAINING = 'training';
    const REASON_MEETING = 'meeting';
    const REASON_OTHER = 'other';

    /**
     * Status constants
     */
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';

    /**
     * Get all reason types
     */
    public static function getReasonTypes(): array
    {
        return [
            self::REASON_CLIENT_VISIT => 'Client Visit',
            self::REASON_FIELD_WORK => 'Field Work',
            self::REASON_TRAINING => 'Training',
            self::REASON_MEETING => 'Meeting',
            self::REASON_OTHER => 'Other',
        ];
    }

    /**
     * Get the user who made the request
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who reviewed the request
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * Check if request is pending
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if request is approved
     */
    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    /**
     * Check if request is rejected
     */
    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    /**
     * Scope for pending requests
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope for approved requests
     */
    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    /**
     * Scope for approved but not synced requests
     */
    public function scopeApprovedNotSynced($query)
    {
        return $query->where('status', self::STATUS_APPROVED)
                     ->where('synced_to_attendance', false);
    }
}
