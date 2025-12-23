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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('triggered_by_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('type', 50);
            $table->string('title', 255);
            $table->text('message');
            $table->foreignId('task_id')->nullable()->constrained('tasks')->onDelete('cascade');
            $table->boolean('read_status')->default(false);
            $table->timestamps();
            
            $table->index('user_id');
            $table->index('type');
            $table->index('task_id');
            $table->index('triggered_by_id');
            $table->index('read_status');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
