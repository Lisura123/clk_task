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
        Schema::create('attendance_time_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('setting_name', 100);
            
            // Check-in time window
            $table->time('check_in_start_time')->default('08:00:00');
            $table->time('check_in_end_time')->default('09:30:00');
            $table->integer('grace_period_minutes')->default(15);
            
            // Check-out time window
            $table->time('check_out_start_time')->default('17:00:00');
            $table->time('check_out_end_time')->default('19:00:00');
            
            // Working hours requirements
            $table->decimal('minimum_working_hours', 4, 2)->default(8.00);
            $table->decimal('maximum_working_hours', 4, 2)->default(12.00);
            
            // Threshold settings
            $table->integer('late_threshold_minutes')->default(15);
            $table->integer('half_day_threshold_minutes')->default(120);
            
            // Validity
            $table->boolean('is_active')->default(true);
            $table->date('effective_from_date');
            $table->date('effective_to_date')->nullable();
            
            // Days of week (JSON array)
            $table->json('applies_to_days')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index('branch_id');
            $table->index('is_active');
            $table->index(['effective_from_date', 'effective_to_date'], 'time_settings_date_range_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_time_settings');
    }
};
