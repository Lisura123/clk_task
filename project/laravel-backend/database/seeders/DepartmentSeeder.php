<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Department;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $departments = [
            ['name' => 'Sales', 'description' => 'Sales Department'],
            ['name' => 'Design and Marketing', 'description' => 'Design and Marketing Department'],
            ['name' => 'Online', 'description' => 'Online Operations Department'],
            ['name' => 'Rent and Service', 'description' => 'Rent and Service Department'],
            ['name' => '2nd Option', 'description' => '2nd Option Department'],
            ['name' => 'Finance', 'description' => 'Finance Department'],
            ['name' => 'Procurement', 'description' => 'Procurement Department'],
            ['name' => 'Academy', 'description' => 'Academy and Training Department'],
            ['name' => 'Call Center', 'description' => 'Call Center Department'],
            ['name' => 'IT', 'description' => 'Information Technology Department'],
        ];

        foreach ($departments as $department) {
            Department::create($department);
        }
    }
}
