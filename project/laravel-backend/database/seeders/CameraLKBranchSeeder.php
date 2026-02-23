<?php

namespace Database\Seeders;

use App\Models\AttendanceTimeSetting;
use App\Models\Branch;
use Illuminate\Database\Seeder;

class CameraLKBranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Seeds the 5 CameraLK branches with GPS coordinates
     */
    public function run(): void
    {
        $branches = [
            [
                'name' => 'CameraLK - Majestic City',
                'code' => 'CLK-MC',
                'branch_type' => Branch::TYPE_HEADQUARTERS,
                'address' => 'Level 3, Majestic City, Galle Road',
                'city' => 'Colombo',
                'district' => 'Colombo',
                'province' => 'Western',
                'latitude' => 6.8928,
                'longitude' => 79.8563,
                'allowed_radius_meters' => 100,
                'contact_number' => '+94 11 2586 789',
                'operating_hours_start' => '08:00',
                'operating_hours_end' => '18:00',
                'time_settings' => [
                    'check_in_start' => '08:00',
                    'check_in_end' => '09:30',
                    'check_out_start' => '17:00',
                    'check_out_end' => '19:00',
                    'grace_period_minutes' => 15,
                    'late_threshold_minutes' => 30,
                    'minimum_working_hours' => 8.0,
                ],
            ],
            [
                'name' => 'CameraLK - Kandy',
                'code' => 'CLK-KY',
                'branch_type' => Branch::TYPE_REGIONAL,
                'address' => 'Dalada Veediya, Kandy City Centre',
                'city' => 'Kandy',
                'district' => 'Kandy',
                'province' => 'Central',
                'latitude' => 7.2906,
                'longitude' => 80.6337,
                'allowed_radius_meters' => 100,
                'contact_number' => '+94 81 2234 567',
                'operating_hours_start' => '08:00',
                'operating_hours_end' => '18:00',
                'time_settings' => [
                    'check_in_start' => '08:00',
                    'check_in_end' => '09:30',
                    'check_out_start' => '17:00',
                    'check_out_end' => '19:00',
                    'grace_period_minutes' => 15,
                    'late_threshold_minutes' => 30,
                    'minimum_working_hours' => 8.0,
                ],
            ],
            [
                'name' => 'CameraLK - Jaffna',
                'code' => 'CLK-JF',
                'branch_type' => Branch::TYPE_REGIONAL,
                'address' => 'Hospital Road, Jaffna Town',
                'city' => 'Jaffna',
                'district' => 'Jaffna',
                'province' => 'Northern',
                'latitude' => 9.6615,
                'longitude' => 80.0255,
                'allowed_radius_meters' => 100,
                'contact_number' => '+94 21 2221 456',
                'operating_hours_start' => '08:00',
                'operating_hours_end' => '18:00',
                'time_settings' => [
                    'check_in_start' => '08:00',
                    'check_in_end' => '09:30',
                    'check_out_start' => '17:00',
                    'check_out_end' => '19:00',
                    'grace_period_minutes' => 15,
                    'late_threshold_minutes' => 30,
                    'minimum_working_hours' => 8.0,
                ],
            ],
            [
                'name' => 'CameraLK - Batticaloa',
                'code' => 'CLK-BC',
                'branch_type' => Branch::TYPE_OUTLET,
                'address' => 'Main Street, Batticaloa Town',
                'city' => 'Batticaloa',
                'district' => 'Batticaloa',
                'province' => 'Eastern',
                'latitude' => 7.7170,
                'longitude' => 81.7000,
                'allowed_radius_meters' => 100,
                'contact_number' => '+94 65 2222 890',
                'operating_hours_start' => '08:00',
                'operating_hours_end' => '18:00',
                'time_settings' => [
                    'check_in_start' => '08:00',
                    'check_in_end' => '09:30',
                    'check_out_start' => '17:00',
                    'check_out_end' => '19:00',
                    'grace_period_minutes' => 15,
                    'late_threshold_minutes' => 30,
                    'minimum_working_hours' => 8.0,
                ],
            ],
            [
                'name' => 'CameraLK - Tissamaharama',
                'code' => 'CLK-TM',
                'branch_type' => Branch::TYPE_OUTLET,
                'address' => 'Main Road, Tissamaharama Town',
                'city' => 'Tissamaharama',
                'district' => 'Hambantota',
                'province' => 'Southern',
                'latitude' => 6.2870,
                'longitude' => 81.2873,
                'allowed_radius_meters' => 100,
                'contact_number' => '+94 47 2237 123',
                'operating_hours_start' => '08:00',
                'operating_hours_end' => '18:00',
                'time_settings' => [
                    'check_in_start' => '08:00',
                    'check_in_end' => '09:30',
                    'check_out_start' => '17:00',
                    'check_out_end' => '19:00',
                    'grace_period_minutes' => 15,
                    'late_threshold_minutes' => 30,
                    'minimum_working_hours' => 8.0,
                ],
            ],
        ];

        foreach ($branches as $branchData) {
            $timeSettings = $branchData['time_settings'];
            unset($branchData['time_settings']);

            // Create branch
            $branch = Branch::updateOrCreate(
                ['code' => $branchData['code']],
                $branchData
            );

            $this->command->info("Created branch: {$branch->name}");

            // Create time settings for branch
            AttendanceTimeSetting::updateOrCreate(
                ['branch_id' => $branch->id],
                [
                    'setting_name' => "{$branch->name} Default Settings",
                    'check_in_start_time' => $timeSettings['check_in_start'],
                    'check_in_end_time' => $timeSettings['check_in_end'],
                    'check_out_start_time' => $timeSettings['check_out_start'],
                    'check_out_end_time' => $timeSettings['check_out_end'],
                    'grace_period_minutes' => $timeSettings['grace_period_minutes'],
                    'late_threshold_minutes' => $timeSettings['late_threshold_minutes'],
                    'minimum_working_hours' => $timeSettings['minimum_working_hours'],
                    'effective_from_date' => now()->toDateString(),
                    'is_active' => true,
                ]
            );

            $this->command->info("Created time settings for: {$branch->name}");
        }

        $this->command->info("\nCameraLK Branches seeded successfully!");
        $this->command->info("Total branches: " . Branch::count());
    }
}
