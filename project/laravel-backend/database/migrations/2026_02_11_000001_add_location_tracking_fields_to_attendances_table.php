<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds enhanced location tracking fields for department/showroom verification
     */
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            // Location verification fields
            if (!Schema::hasColumn('attendances', 'verified_branch_name')) {
                $table->string('verified_branch_name')->nullable()->after('branch_id');
            }
            if (!Schema::hasColumn('attendances', 'verified_branch_address')) {
                $table->text('verified_branch_address')->nullable()->after('verified_branch_name');
            }
            if (!Schema::hasColumn('attendances', 'verified_branch_city')) {
                $table->string('verified_branch_city')->nullable()->after('verified_branch_address');
            }
            
            // Check-in location tracking
            if (!Schema::hasColumn('attendances', 'check_in_address')) {
                $table->text('check_in_address')->nullable()->after('check_in_longitude');
            }
            if (!Schema::hasColumn('attendances', 'check_in_timestamp')) {
                $table->timestamp('check_in_timestamp')->nullable()->after('check_in_address');
            }
            if (!Schema::hasColumn('attendances', 'check_in_gps_accuracy')) {
                $table->decimal('check_in_gps_accuracy', 8, 2)->nullable()->after('check_in_timestamp');
            }
            
            // Check-out location tracking  
            if (!Schema::hasColumn('attendances', 'check_out_address')) {
                $table->text('check_out_address')->nullable()->after('check_out_longitude');
            }
            if (!Schema::hasColumn('attendances', 'check_out_timestamp')) {
                $table->timestamp('check_out_timestamp')->nullable()->after('check_out_address');
            }
            if (!Schema::hasColumn('attendances', 'check_out_gps_accuracy')) {
                $table->decimal('check_out_gps_accuracy', 8, 2)->nullable()->after('check_out_timestamp');
            }
            
            // Location verification status
            if (!Schema::hasColumn('attendances', 'location_verified')) {
                $table->boolean('location_verified')->default(false)->after('gps_validated');
            }
            if (!Schema::hasColumn('attendances', 'location_verification_notes')) {
                $table->text('location_verification_notes')->nullable()->after('location_verified');
            }
            
            // Track if employee was at correct department/showroom
            if (!Schema::hasColumn('attendances', 'at_assigned_location')) {
                $table->boolean('at_assigned_location')->default(true)->after('location_verified');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $columns = [
                'verified_branch_name',
                'verified_branch_address', 
                'verified_branch_city',
                'check_in_address',
                'check_in_timestamp',
                'check_in_gps_accuracy',
                'check_out_address',
                'check_out_timestamp',
                'check_out_gps_accuracy',
                'location_verified',
                'location_verification_notes',
                'at_assigned_location',
            ];
            
            foreach ($columns as $column) {
                if (Schema::hasColumn('attendances', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
