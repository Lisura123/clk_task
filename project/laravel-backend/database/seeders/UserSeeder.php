<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Department;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get IT department
        $itDepartment = Department::where('name', 'IT')->first();

        // Create super admin
        User::create([
            'name' => 'Super Administrator',
            'username' => 'admin',
            'email' => 'admin@taskmanagement.com',
            'password' => Hash::make('admin123'),
            'role' => 'super_admin',
            'department' => 'IT',
            'department_id' => $itDepartment?->id,
            'status' => 'active',
        ]);

        // Create some department admins
        $salesDept = Department::where('name', 'Sales')->first();
        User::create([
            'name' => 'Sales Manager',
            'username' => 'sales_admin',
            'email' => 'sales.admin@company.com',
            'password' => Hash::make('password'),
            'role' => 'dept_admin',
            'department' => 'Sales',
            'department_id' => $salesDept?->id,
            'managed_department_ids' => ['Sales'],
            'status' => 'active',
        ]);

        User::create([
            'name' => 'IT Manager',
            'username' => 'it_admin',
            'email' => 'it.admin@company.com',
            'password' => Hash::make('password'),
            'role' => 'dept_admin',
            'department' => 'IT',
            'department_id' => $itDepartment?->id,
            'managed_department_ids' => ['IT'],
            'status' => 'active',
        ]);

        // Create sample employees
        User::create([
            'name' => 'John Doe',
            'username' => 'john.doe',
            'email' => 'john.doe@company.com',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'department' => 'Sales',
            'department_id' => $salesDept?->id,
            'phone' => '+94777123456',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Jane Smith',
            'username' => 'jane.smith',
            'email' => 'jane.smith@company.com',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'department' => 'Sales',
            'department_id' => $salesDept?->id,
            'phone' => '+94777123457',
            'status' => 'active',
        ]);

        User::create([
            'name' => 'Bob Wilson',
            'username' => 'bob.wilson',
            'email' => 'bob.wilson@company.com',
            'password' => Hash::make('password'),
            'role' => 'employee',
            'department' => 'IT',
            'department_id' => $itDepartment?->id,
            'phone' => '+94777123458',
            'status' => 'active',
        ]);
    }
}
