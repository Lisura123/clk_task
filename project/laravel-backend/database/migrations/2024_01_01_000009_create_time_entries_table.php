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
        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('tasks')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->dateTime('start_time');
            $table->dateTime('end_time')->nullable();
            $table->integer('duration_minutes')->nullable()->comment('Calculated duration in minutes');
            $table->text('description')->nullable();
            $table->enum('category', [
                'development', 'testing', 'documentation', 'design', 
                'meeting', 'review', 'deployment', 'planning', 'other'
            ])->default('other');
            $table->boolean('is_billable')->default(false);
            $table->boolean('is_manual_entry')->default(true);
            $table->boolean('is_running')->default(false)->comment('TRUE if timer is currently active');
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();
            
            $table->index('task_id');
            $table->index('user_id');
            $table->index('is_running');
            $table->index('start_time');
            $table->index('is_billable');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_entries');
    }
};
