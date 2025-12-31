<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'department_id',
        'created_by',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'group_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function leaders()
    {
        return $this->belongsToMany(User::class, 'group_members')
            ->wherePivot('role', 'leader')
            ->withTimestamps();
    }

    public function plans()
    {
        return $this->hasMany(GroupPlan::class);
    }

    public function messages()
    {
        return $this->hasMany(GroupMessage::class);
    }
}
