<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Models\Notification;
use App\Notifications\TaskAlertNotification;
use Illuminate\Console\Command;
use Carbon\Carbon;

class SendTaskAlerts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tasks:send-alerts';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send notifications for upcoming deadlines and overdue tasks';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for tasks requiring alerts...');

        // Send deadline alerts for tasks due in 24 hours
        $this->sendDeadlineAlerts();

        // Send overdue alerts for tasks past due date
        $this->sendOverdueAlerts();

        $this->info('Task alerts sent successfully!');
        return 0;
    }

    /**
     * Send alerts for tasks due in 24 hours
     */
    private function sendDeadlineAlerts()
    {
        $tomorrow = Carbon::now()->addDay();
        $dayAfterTomorrow = Carbon::now()->addDays(2);

        $tasks = Task::where('status', '!=', 'completed')
            ->whereBetween('due_date', [Carbon::now(), $dayAfterTomorrow])
            ->with('assignedTo')
            ->get();

        foreach ($tasks as $task) {
            if (!$task->assignedTo) {
                continue;
            }

            // Check if we already sent an alert in the last 12 hours
            $existingAlert = Notification::where('user_id', $task->assigned_to_id)
                ->where('type', 'deadline_alert')
                ->where('task_id', $task->id)
                ->where('created_at', '>=', Carbon::now()->subHours(12))
                ->exists();

            if (!$existingAlert) {
                $hoursRemaining = Carbon::now()->diffInHours($task->due_date);
                
                // Create in-app notification
                Notification::create([
                    'user_id' => $task->assigned_to_id,
                    'type' => 'deadline_alert',
                    'title' => 'Task Deadline Approaching',
                    'message' => "Task '{$task->title}' is due in {$hoursRemaining} hours.",
                    'task_id' => $task->id,
                    'read_status' => false,
                ]);

                // Send email notification
                try {
                    $task->assignedTo->notify(new TaskAlertNotification($task, 'deadline', $hoursRemaining));
                    $this->line("Deadline alert + email sent for task #{$task->id}");
                } catch (\Exception $e) {
                    $this->warn("Email failed for task #{$task->id}: " . $e->getMessage());
                    $this->line("Deadline alert sent for task #{$task->id} (email failed)");
                }
            }
        }
    }

    /**
     * Send alerts for overdue tasks
     */
    private function sendOverdueAlerts()
    {
        $tasks = Task::where('status', '!=', 'completed')
            ->where('due_date', '<', Carbon::now())
            ->with('assignedTo')
            ->get();

        foreach ($tasks as $task) {
            if (!$task->assignedTo) {
                continue;
            }

            // Check if we already sent an overdue alert in the last 24 hours
            $existingAlert = Notification::where('user_id', $task->assigned_to_id)
                ->where('type', 'task_overdue')
                ->where('task_id', $task->id)
                ->where('created_at', '>=', Carbon::now()->subDay())
                ->exists();

            if (!$existingAlert) {
                $daysOverdue = Carbon::now()->diffInDays($task->due_date);
                
                // Create in-app notification
                Notification::create([
                    'user_id' => $task->assigned_to_id,
                    'type' => 'task_overdue',
                    'title' => 'Task Overdue',
                    'message' => "Task '{$task->title}' is overdue by {$daysOverdue} day(s).",
                    'task_id' => $task->id,
                    'read_status' => false,
                ]);

                // Send email notification
                try {
                    $task->assignedTo->notify(new TaskAlertNotification($task, 'overdue', $daysOverdue));
                    $this->line("Overdue alert + email sent for task #{$task->id}");
                } catch (\Exception $e) {
                    $this->warn("Email failed for task #{$task->id}: " . $e->getMessage());
                    $this->line("Overdue alert sent for task #{$task->id} (email failed)");
                }
            }
        }
    }
}
