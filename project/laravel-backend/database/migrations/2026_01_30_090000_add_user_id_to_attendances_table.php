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
        Schema::table('attendances', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('id');
            $table->index('user_id');
            
            // Foreign key constraint
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('set null');
        });
        
        // Match existing attendance records with users based on emp_code
        $this->matchExistingRecords();
    }
    
    /**
     * Match existing attendance records with users based on emp_code
     */
    private function matchExistingRecords(): void
    {
        // Get all users with emp_code
        $users = \App\Models\User::whereNotNull('emp_code')
            ->where('emp_code', '!=', '')
            ->get(['id', 'emp_code']);
        
        foreach ($users as $user) {
            \App\Models\Attendance::where('emp_code', $user->emp_code)
                ->update(['user_id' => $user->id]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropIndex(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
