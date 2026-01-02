<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_daily_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scheduled_plan_id')->constrained('scheduled_plans')->onDelete('cascade');
            $table->date('entry_date');
            $table->json('todo_items')->nullable(); // Array of to-do items
            $table->json('done_items')->nullable(); // Array of completed items
            $table->text('daily_notes')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            // Each plan can have only one entry per date
            $table->unique(['scheduled_plan_id', 'entry_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_daily_entries');
    }
};
