<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scheduled_plans', function (Blueprint $table) {
            // Drop foreign key constraint first
            $table->dropForeign(['assigned_to']);
        });

        Schema::table('scheduled_plans', function (Blueprint $table) {
            // Now drop the columns that are no longer needed
            $table->dropColumn(['type', 'status', 'priority', 'assigned_to', 'location']);
        });
    }

    public function down(): void
    {
        Schema::table('scheduled_plans', function (Blueprint $table) {
            // Re-add the columns
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->enum('type', ['meeting', 'task', 'event', 'deadline', 'reminder', 'other'])->default('task');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'cancelled'])->default('pending');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->string('location')->nullable();
        });
    }
};
