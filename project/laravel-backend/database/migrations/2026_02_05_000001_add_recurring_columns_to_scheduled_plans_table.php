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
        Schema::table('scheduled_plans', function (Blueprint $table) {
            if (!Schema::hasColumn('scheduled_plans', 'is_recurring')) {
                $table->boolean('is_recurring')->default(false)->after('end_date');
            }
            if (!Schema::hasColumn('scheduled_plans', 'recurrence_pattern')) {
                $table->string('recurrence_pattern')->nullable()->after('is_recurring');
            }
            if (!Schema::hasColumn('scheduled_plans', 'recurrence_end_date')) {
                $table->date('recurrence_end_date')->nullable()->after('recurrence_pattern');
            }
            if (!Schema::hasColumn('scheduled_plans', 'notes')) {
                $table->text('notes')->nullable()->after('daily_targets');
            }
            if (!Schema::hasColumn('scheduled_plans', 'created_by')) {
                $table->foreignId('created_by')->nullable()->after('user_id')->constrained('users')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('scheduled_plans', function (Blueprint $table) {
            $table->dropColumn(['is_recurring', 'recurrence_pattern', 'recurrence_end_date', 'notes']);
            $table->dropForeign(['created_by']);
            $table->dropColumn('created_by');
        });
    }
};
