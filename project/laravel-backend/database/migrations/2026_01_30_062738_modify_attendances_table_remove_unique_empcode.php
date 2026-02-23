<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            // Drop the unique constraint on emp_code
            $table->dropUnique(['emp_code']);
            
            // Add a unique constraint on emp_code + date combination instead
            $table->unique(['emp_code', 'date'], 'attendances_emp_code_date_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropUnique('attendances_emp_code_date_unique');
            $table->unique('emp_code');
        });
    }
};
