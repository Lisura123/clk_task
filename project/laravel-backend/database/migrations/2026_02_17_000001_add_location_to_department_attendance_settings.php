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
        Schema::table('department_attendance_settings', function (Blueprint $table) {
            $table->string('location_name')->nullable()->after('department_id');
            $table->string('address')->nullable()->after('location_name');
            $table->string('city')->nullable()->after('address');
            $table->decimal('latitude', 10, 8)->nullable()->after('city');
            $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
            $table->integer('allowed_radius_meters')->default(100)->after('longitude');
            $table->boolean('gps_required')->default(true)->after('allowed_radius_meters');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('department_attendance_settings', function (Blueprint $table) {
            $table->dropColumn([
                'location_name',
                'address', 
                'city',
                'latitude',
                'longitude',
                'allowed_radius_meters',
                'gps_required'
            ]);
        });
    }
};
