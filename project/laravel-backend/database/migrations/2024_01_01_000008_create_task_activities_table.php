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
        Schema::create('task_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('activity_type', [
                'task_created', 'status_changed', 'progress_updated', 'assignment_changed',
                'due_date_changed', 'priority_changed', 'department_changed', 'comment_added',
                'file_uploaded', 'file_deleted', 'link_added', 'link_removed', 'task_edited',
                'user_mentioned', 'task_completed', 'task_reopened', 'task_deleted',
                'task_archived', 'watcher_added', 'watcher_removed', 'tag_added', 'tag_removed',
                'time_logged', 'timer_started', 'timer_stopped'
            ]);
            $table->text('description');
            $table->json('metadata')->nullable()->comment('Stores activity-specific data like old/new values');
            $table->boolean('is_system_generated')->default(true);
            $table->timestamps();
            
            $table->index('task_id');
            $table->index('user_id');
            $table->index('activity_type');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_activities');
    }
};
