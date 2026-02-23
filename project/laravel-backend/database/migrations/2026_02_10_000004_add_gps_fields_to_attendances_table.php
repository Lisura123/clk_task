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
        // Add columns one by one, checking if they already exist
        if (!Schema::hasColumn('attendances', 'attendance_method')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->enum('attendance_method', ['upload', 'gps_app', 'manual_entry'])->default('upload')->after('branch_id');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'check_in_device_info')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->json('check_in_device_info')->nullable()->after('check_in_longitude');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'check_in_distance_meters')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->integer('check_in_distance_meters')->nullable()->after('check_in_longitude');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'check_out_device_info')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->json('check_out_device_info')->nullable()->after('check_out_longitude');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'check_out_distance_meters')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->integer('check_out_distance_meters')->nullable()->after('check_out_longitude');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'gps_validated')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->boolean('gps_validated')->default(false)->after('attendance_status');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'gps_validation_status')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->enum('gps_validation_status', ['valid', 'outside_radius', 'outside_time', 'duplicate', 'manual', 'admin_approved'])->default('valid')->after('attendance_status');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'working_hours')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->decimal('working_hours', 5, 2)->nullable()->after('attendance_status');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'is_late')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->boolean('is_late')->default(false)->after('attendance_status');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'late_minutes')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->integer('late_minutes')->default(0)->after('attendance_status');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'late_by_minutes')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->integer('late_by_minutes')->default(0)->after('attendance_status');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'is_early_leave')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->boolean('is_early_leave')->default(false)->after('attendance_status');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'early_by_minutes')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->integer('early_by_minutes')->default(0)->after('attendance_status');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'requires_approval')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->boolean('requires_approval')->default(false)->after('attendance_status');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'approved_by')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            });
        }
        
        if (!Schema::hasColumn('attendances', 'approval_status')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->enum('approval_status', ['pending', 'approved', 'rejected'])->nullable();
            });
        }
        
        if (!Schema::hasColumn('attendances', 'approval_notes')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->text('approval_notes')->nullable();
            });
        }
        
        if (!Schema::hasColumn('attendances', 'approved_at')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->timestamp('approved_at')->nullable();
            });
        }
        
        if (!Schema::hasColumn('attendances', 'ip_address')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->string('ip_address', 45)->nullable();
            });
        }
        
        if (!Schema::hasColumn('attendances', 'user_agent')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->text('user_agent')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $columns = [
                'attendance_method',
                'check_in_device_info',
                'check_in_distance_meters',
                'check_out_device_info',
                'check_out_distance_meters',
                'gps_validated',
                'gps_validation_status',
                'working_hours',
                'is_late',
                'late_minutes',
                'late_by_minutes',
                'is_early_leave',
                'early_by_minutes',
                'requires_approval',
                'approved_by',
                'approval_status',
                'approval_notes',
                'approved_at',
                'ip_address',
                'user_agent',
            ];
            
            foreach ($columns as $column) {
                if (Schema::hasColumn('attendances', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
