<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Two-level approval workflow:
     * - Employee applies -> HOD approves -> Admin approves -> Approved
     * - HOD applies -> Admin approves -> Approved
     */
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            // HOD approval fields
            $table->foreignId('hod_approved_by')->nullable()->constrained('users')->nullOnDelete()->after('status');
            $table->timestamp('hod_approved_at')->nullable()->after('hod_approved_by');
            $table->text('hod_notes')->nullable()->after('hod_approved_at');
            
            // Rename existing approved_by to admin_approved_by for clarity
            // We'll handle the data migration separately
            $table->foreignId('admin_approved_by')->nullable()->constrained('users')->nullOnDelete()->after('hod_notes');
            $table->timestamp('admin_approved_at')->nullable()->after('admin_approved_by');
            
            // Status can now be: pending, hod_approved, approved, rejected, cancelled
            // pending = waiting for HOD approval (or admin if requester is HOD)
            // hod_approved = HOD approved, waiting for admin approval (only for employees)
            // approved = fully approved
            // rejected = rejected at any level
            // cancelled = cancelled by requester
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropForeign(['hod_approved_by']);
            $table->dropColumn(['hod_approved_by', 'hod_approved_at', 'hod_notes']);
            $table->dropForeign(['admin_approved_by']);
            $table->dropColumn(['admin_approved_by', 'admin_approved_at']);
        });
    }
};
