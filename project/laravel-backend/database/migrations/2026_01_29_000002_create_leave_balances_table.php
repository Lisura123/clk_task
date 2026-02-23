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
        Schema::create('leave_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('leave_type_id')->constrained('leave_types')->onDelete('cascade');
            $table->year('year');
            $table->decimal('allocated_days', 5, 1)->default(0); // Total days allocated
            $table->decimal('used_days', 5, 1)->default(0); // Days already used
            $table->decimal('pending_days', 5, 1)->default(0); // Days in pending requests
            $table->decimal('carried_over', 5, 1)->default(0); // Days carried from previous year
            $table->timestamps();
            
            $table->unique(['user_id', 'leave_type_id', 'year']);
            $table->index(['user_id', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_balances');
    }
};
