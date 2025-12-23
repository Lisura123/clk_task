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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('username', 50)->unique();
            $table->string('email', 100)->unique();
            $table->string('password', 255);
            $table->enum('role', ['super_admin', 'dept_admin', 'employee'])->default('employee');
            $table->string('department', 100);
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('set null');
            $table->json('managed_department_ids')->nullable()->comment('Array of department IDs managed by dept_admin');
            $table->string('profile_picture', 255)->nullable();
            $table->string('phone', 20)->nullable();
            $table->enum('status', ['pending', 'active', 'inactive'])->default('pending');
            $table->timestamps();
            
            $table->index('email');
            $table->index('role');
            $table->index('department_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
