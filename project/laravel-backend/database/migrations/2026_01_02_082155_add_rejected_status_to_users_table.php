<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify ENUM to include 'rejected' status
        DB::statement("ALTER TABLE users MODIFY status ENUM('pending', 'active', 'inactive', 'rejected') NOT NULL DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to original ENUM values
        DB::statement("ALTER TABLE users MODIFY status ENUM('pending', 'active', 'inactive') NOT NULL DEFAULT 'pending'");
    }
};
