<?php

namespace App\Filament\Widgets;

use App\Models\User;
use App\Models\Task;
use App\Models\Department;
use App\Models\TimeEntry;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class DashboardStatsWidget extends BaseWidget
{
    protected static ?int $sort = 1;
    
    protected function getStats(): array
    {
        try {
            $totalUsers = User::count();
            $activeUsers = User::where('status', 'active')->count();
            $pendingUsers = User::where('status', 'pending')->count();
            
            $totalTasks = Task::where('is_archived', false)->count();
            $completedTasks = Task::where('status', 'completed')->where('is_archived', false)->count();
            $inProgressTasks = Task::where('status', 'in-progress')->where('is_archived', false)->count();
            $overdueTasks = Task::where('due_date', '<', now())
                ->where('status', '!=', 'completed')
                ->where('is_archived', false)
                ->count();
            
            $totalDepartments = Department::count();
            
            // Calculate total hours from duration_minutes
            $totalMinutes = TimeEntry::sum('duration_minutes') ?? 0;
            $totalHoursLogged = round($totalMinutes / 60, 1);
        
            return [
                Stat::make('Total Users', $totalUsers)
                    ->description("$activeUsers active, $pendingUsers pending")
                    ->descriptionIcon('heroicon-o-users')
                    ->color('success')
                    ->chart([7, 12, 15, 18, 20, 22, $totalUsers]),
                    
                Stat::make('Active Tasks', $totalTasks)
                    ->description("$completedTasks completed, $inProgressTasks in progress")
                    ->descriptionIcon('heroicon-o-clipboard-document-check')
                    ->color('primary')
                    ->chart([10, 15, 20, 25, 30, 28, $totalTasks]),
                    
                Stat::make('Overdue Tasks', $overdueTasks)
                    ->description('Tasks past due date')
                    ->descriptionIcon('heroicon-o-exclamation-triangle')
                    ->color($overdueTasks > 0 ? 'danger' : 'success'),
                    
                Stat::make('Departments', $totalDepartments)
                    ->description('Total departments')
                    ->descriptionIcon('heroicon-o-building-office')
                    ->color('info'),
                    
                Stat::make('Total Hours Logged', number_format($totalHoursLogged, 1))
                    ->description('All time tracking')
                    ->descriptionIcon('heroicon-o-clock')
                    ->color('warning'),
            ];
        } catch (\Exception $e) {
            return [
                Stat::make('Error', 'Unable to load statistics')
                    ->description($e->getMessage())
                    ->color('danger'),
            ];
        }
    }
}
