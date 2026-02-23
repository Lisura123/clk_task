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
        Schema::create('gps_validation_failures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            
            // Attempted location
            $table->decimal('attempted_latitude', 10, 8);
            $table->decimal('attempted_longitude', 11, 8);
            
            // Branch location
            $table->decimal('branch_latitude', 10, 8);
            $table->decimal('branch_longitude', 11, 8);
            
            // Distance calculations
            $table->integer('calculated_distance_meters');
            $table->integer('allowed_radius_meters');
            $table->integer('distance_exceeded_by_meters');
            
            // Failure details
            $table->enum('failure_type', [
                'outside_radius',
                'gps_unavailable',
                'gps_accuracy_low',
                'suspicious_location',
                'wrong_branch'
            ]);
            
            // GPS quality
            $table->decimal('gps_accuracy_meters', 8, 2)->nullable();
            
            // Device info
            $table->json('device_info')->nullable();
            $table->string('ip_address', 45)->nullable();
            
            // Timing
            $table->timestamp('attempt_time');
            
            // Flags
            $table->boolean('is_flagged_suspicious')->default(false);
            $table->boolean('admin_reviewed')->default(false);
            $table->text('review_notes')->nullable();
            
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
            $table->index('branch_id');
            $table->index('failure_type');
            $table->index('is_flagged_suspicious');
            $table->index('attempt_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gps_validation_failures');
    }
};
