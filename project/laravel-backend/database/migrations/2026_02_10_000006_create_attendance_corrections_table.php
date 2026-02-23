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
        Schema::create('attendance_corrections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('set null');
            
            // Correction details
            $table->enum('correction_type', ['check_in', 'check_out', 'both', 'absent_to_present', 'late_to_on_time']);
            $table->time('current_check_in_time')->nullable();
            $table->time('requested_check_in_time')->nullable();
            $table->time('current_check_out_time')->nullable();
            $table->time('requested_check_out_time')->nullable();
            
            // Justification
            $table->text('reason');
            $table->json('supporting_evidence')->nullable();
            
            // Status
            $table->enum('status', ['pending', 'approved', 'rejected', 'withdrawn'])->default('pending');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            
            // Review
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('review_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            
            $table->timestamps();

            $table->index('status');
            $table->index('user_id');
            $table->index('reviewed_by');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_corrections');
    }
};
