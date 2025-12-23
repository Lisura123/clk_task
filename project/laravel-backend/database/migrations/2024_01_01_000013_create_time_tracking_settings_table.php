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
        Schema::create('time_tracking_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade')->comment('NULL for department-wide settings');
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('cascade')->comment('NULL for user-specific settings');
            $table->boolean('auto_start_timer')->default(false);
            $table->integer('reminder_interval_minutes')->default(60)->comment('Reminder frequency for time logging');
            $table->integer('allow_edit_window_hours')->default(24)->comment('Hours within which time entries can be edited');
            $table->boolean('require_description')->default(true);
            $table->string('default_category', 50)->default('other');
            $table->timestamps();
            
            $table->index('user_id');
            $table->index('department_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_tracking_settings');
    }
};
