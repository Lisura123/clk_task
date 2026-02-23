<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Update user roles: super_admin -> admin, dept_admin -> hod, add senior_employee
     */
    public function up(): void
    {
        // First, alter the enum to include all possible values (old + new)
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'dept_admin', 'admin', 'hod', 'senior_employee', 'employee') DEFAULT 'employee'");
        
        // Now update the role values
        DB::statement("UPDATE users SET role = 'admin' WHERE role = 'super_admin'");
        DB::statement("UPDATE users SET role = 'hod' WHERE role = 'dept_admin'");
        
        // Finally, remove old values from enum
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'hod', 'senior_employee', 'employee') DEFAULT 'employee'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // First, alter the enum to include all possible values (old + new)
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'dept_admin', 'admin', 'hod', 'senior_employee', 'employee') DEFAULT 'employee'");
        
        // Revert role names
        DB::statement("UPDATE users SET role = 'super_admin' WHERE role = 'admin'");
        DB::statement("UPDATE users SET role = 'dept_admin' WHERE role = 'hod'");
        DB::statement("UPDATE users SET role = 'employee' WHERE role = 'senior_employee'");
        
        // Finally, restore original enum
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'dept_admin', 'employee') DEFAULT 'employee'");
    }
};
