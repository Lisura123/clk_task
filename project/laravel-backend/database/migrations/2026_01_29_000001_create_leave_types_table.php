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
        Schema::create('leave_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100); // Annual Leave, Sick Leave, etc.
            $table->string('code', 20)->unique(); // AL, SL, ML, etc.
            $table->text('description')->nullable();
            $table->integer('default_days_per_year')->default(0);
            $table->boolean('is_paid')->default(true);
            $table->boolean('requires_attachment')->default(false);
            $table->integer('max_consecutive_days')->nullable();
            $table->integer('min_notice_days')->default(0); // Minimum days before leave date to apply
            $table->boolean('is_active')->default(true);
            $table->string('color', 20)->default('#3B82F6'); // For calendar display
            $table->timestamps();
            
            $table->index('code');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leave_types');
    }
};
