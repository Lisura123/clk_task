<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_work_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('work_date');
            $table->text('description');
            $table->decimal('hours_worked', 5, 2)->nullable();
            $table->integer('progress_percentage')->nullable(); // 0-100
            $table->enum('status', ['in_progress', 'completed', 'blocked', 'need_review'])->default('in_progress');
            $table->text('blockers')->nullable();
            $table->timestamps();
            
            $table->index(['task_id', 'work_date']);
            $table->index(['user_id', 'work_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_work_logs');
    }
};
