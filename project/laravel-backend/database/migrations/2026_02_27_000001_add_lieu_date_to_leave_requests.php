<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds lieu_date column to track the date an employee worked
     * that entitles them to a Lieu Leave (compensatory leave).
     */
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->date('lieu_date')->nullable()->after('end_date')
                  ->comment('The date the employee worked that entitles them to lieu leave');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn('lieu_date');
        });
    }
};
