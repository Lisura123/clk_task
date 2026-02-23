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
        // Check if table exists (may have been created by previous migration)
        if (Schema::hasTable('branches')) {
            // Add missing columns to existing table - handle each separately for safety
            if (!Schema::hasColumn('branches', 'code')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->string('code', 20)->unique()->after('name');
                });
            }
            if (!Schema::hasColumn('branches', 'branch_type')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->enum('branch_type', ['headquarters', 'regional', 'outlet'])->default('regional')->after('name');
                });
            }
            if (!Schema::hasColumn('branches', 'city')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->string('city', 100)->nullable()->after('longitude');
                });
            }
            if (!Schema::hasColumn('branches', 'district')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->string('district', 100)->nullable()->after('longitude');
                });
            }
            if (!Schema::hasColumn('branches', 'province')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->string('province', 100)->nullable()->after('longitude');
                });
            }
            // Handle allowed_radius -> allowed_radius_meters rename
            if (Schema::hasColumn('branches', 'allowed_radius') && !Schema::hasColumn('branches', 'allowed_radius_meters')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->renameColumn('allowed_radius', 'allowed_radius_meters');
                });
            } elseif (!Schema::hasColumn('branches', 'allowed_radius_meters')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->integer('allowed_radius_meters')->default(100)->after('longitude');
                });
            }
            if (!Schema::hasColumn('branches', 'contact_number')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->string('contact_number', 20)->nullable()->after('is_active');
                });
            }
            if (!Schema::hasColumn('branches', 'operating_hours_start')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->time('operating_hours_start')->default('08:00:00')->after('is_active');
                });
            }
            if (!Schema::hasColumn('branches', 'operating_hours_end')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->time('operating_hours_end')->default('18:00:00')->after('is_active');
                });
            }
            if (!Schema::hasColumn('branches', 'time_zone')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->string('time_zone', 50)->default('Asia/Colombo')->after('is_active');
                });
            }
            if (!Schema::hasColumn('branches', 'branch_manager_id')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->foreignId('branch_manager_id')->nullable()->constrained('users')->onDelete('set null');
                });
            }
            if (!Schema::hasColumn('branches', 'created_by')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
                });
            }
            if (!Schema::hasColumn('branches', 'updated_by')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
                });
            }
            if (!Schema::hasColumn('branches', 'deleted_at')) {
                Schema::table('branches', function (Blueprint $table) {
                    $table->softDeletes();
                });
            }
        } else {
            // Create fresh table
            Schema::create('branches', function (Blueprint $table) {
                $table->id();
                $table->string('name', 100);
                $table->string('code', 20)->unique();
                $table->enum('branch_type', ['headquarters', 'regional', 'outlet'])->default('regional');
                $table->text('address');
                $table->string('city', 100)->nullable();
                $table->string('district', 100)->nullable();
                $table->string('province', 100)->nullable();
                $table->decimal('latitude', 10, 8);
                $table->decimal('longitude', 11, 8);
                $table->integer('allowed_radius_meters')->default(100);
                $table->string('contact_number', 20)->nullable();
                $table->time('operating_hours_start')->default('08:00:00');
                $table->time('operating_hours_end')->default('18:00:00');
                $table->string('time_zone', 50)->default('Asia/Colombo');
                $table->boolean('is_active')->default(true);
                $table->foreignId('branch_manager_id')->nullable()->constrained('users')->onDelete('set null');
                $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
                $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamps();
                $table->softDeletes();

                $table->index('city');
                $table->index('is_active');
                $table->index(['latitude', 'longitude']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Only drop columns we added if table existed before
        if (Schema::hasTable('branches')) {
            Schema::table('branches', function (Blueprint $table) {
                $columns = ['code', 'branch_type', 'city', 'district', 'province', 'contact_number', 
                           'operating_hours_start', 'operating_hours_end', 'time_zone',
                           'branch_manager_id', 'created_by', 'updated_by', 'deleted_at'];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('branches', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
