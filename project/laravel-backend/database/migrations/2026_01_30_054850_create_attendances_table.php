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
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('emp_code')->unique();
            $table->string('fp_code')->nullable();
            $table->string('dept_name')->nullable();
            $table->time('in_time')->nullable();
            $table->time('out_time')->nullable();
            $table->timestamps();
            
            // Index for faster queries
            $table->index(['date', 'emp_code']);
            $table->index('dept_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
