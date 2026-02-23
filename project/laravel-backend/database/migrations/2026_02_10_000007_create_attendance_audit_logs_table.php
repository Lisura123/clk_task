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
        Schema::create('attendance_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('set null');
            
            // Action details
            $table->enum('action', [
                'check_in_attempt',
                'check_in_success',
                'check_in_failed',
                'check_out_attempt',
                'check_out_success',
                'check_out_failed',
                'manual_entry',
                'correction_requested',
                'correction_approved',
                'correction_rejected',
                'deleted',
                'modified'
            ]);
            
            // GPS data
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->integer('distance_from_branch_meters')->nullable();
            
            // Failure details
            $table->string('failure_reason', 255)->nullable();
            $table->json('validation_details')->nullable();
            
            // Device & security info
            $table->json('device_info')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            
            // Admin action tracking
            $table->foreignId('performed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('notes')->nullable();
            
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id');
            $table->index('branch_id');
            $table->index('action');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_audit_logs');
    }
};
