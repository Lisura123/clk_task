<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LeaveType;
use Illuminate\Support\Facades\DB;

class LeaveTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $leaveTypes = [
            [
                'name' => 'Annual Leave',
                'code' => 'ANNUAL',
                'description' => 'Regular annual leave entitlement for all employees',
                'default_days_per_year' => 14,
                'is_paid' => true,
                'requires_attachment' => false,
                'max_consecutive_days' => null,
                'min_notice_days' => 3,
                'is_active' => true,
                'color' => '#3B82F6', // Blue
            ],
            [
                'name' => 'Lieu Leave',
                'code' => 'LIEU',
                'description' => 'Compensatory leave for working on official holidays or leave days. Employees who work on designated off days can take time off in lieu.',
                'default_days_per_year' => 0, // Not allocated by default, earned by working on holidays
                'is_paid' => true,
                'requires_attachment' => false,
                'max_consecutive_days' => null,
                'min_notice_days' => 1,
                'is_active' => true,
                'color' => '#8B5CF6', // Purple
            ],
            [
                'name' => 'Compassionate Leave',
                'code' => 'COMPASSIONATE',
                'description' => 'Leave for family emergencies, bereavement, or other compassionate reasons',
                'default_days_per_year' => 7,
                'is_paid' => true,
                'requires_attachment' => false,
                'max_consecutive_days' => 7,
                'min_notice_days' => 0, // Can be applied immediately in emergencies
                'is_active' => true,
                'color' => '#7C3AED', // Violet
            ],
        ];

        foreach ($leaveTypes as $leaveType) {
            // Use updateOrCreate to avoid duplicates
            LeaveType::updateOrCreate(
                ['code' => $leaveType['code']],
                $leaveType
            );
        }
    }
}
