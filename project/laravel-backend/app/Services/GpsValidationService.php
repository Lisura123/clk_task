<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceAuditLog;
use App\Models\AttendanceTimeSetting;
use App\Models\Branch;
use App\Models\GpsValidationFailure;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class GpsValidationService
{
    /**
     * Earth radius in meters for Haversine formula
     */
    const EARTH_RADIUS_METERS = 6371000;

    /**
     * Maximum acceptable GPS accuracy in meters
     */
    const MAX_GPS_ACCURACY_METERS = 50;

    /**
     * Calculate distance between two GPS coordinates using Haversine formula
     * 
     * @param float $lat1 Latitude of first point
     * @param float $lon1 Longitude of first point
     * @param float $lat2 Latitude of second point
     * @param float $lon2 Longitude of second point
     * @return int Distance in meters
     */
    public function calculateDistance(float $lat1, float $lon1, float $lat2, float $lon2): int
    {
        // Convert to radians
        $lat1Rad = deg2rad($lat1);
        $lon1Rad = deg2rad($lon1);
        $lat2Rad = deg2rad($lat2);
        $lon2Rad = deg2rad($lon2);

        // Differences
        $deltaLat = $lat2Rad - $lat1Rad;
        $deltaLon = $lon2Rad - $lon1Rad;

        // Haversine formula
        $a = sin($deltaLat / 2) ** 2 + cos($lat1Rad) * cos($lat2Rad) * sin($deltaLon / 2) ** 2;
        $c = 2 * asin(sqrt($a));

        // Distance in meters
        return (int) round(self::EARTH_RADIUS_METERS * $c);
    }

    /**
     * Validate GPS location against a branch
     * 
     * @param float $latitude User's latitude
     * @param float $longitude User's longitude
     * @param Branch $branch Branch to validate against
     * @param float|null $gpsAccuracy GPS accuracy reported by device
     * @return array Validation result
     */
    public function validateLocation(
        float $latitude, 
        float $longitude, 
        Branch $branch,
        ?float $gpsAccuracy = null
    ): array {
        // Calculate distance from branch
        $distance = $this->calculateDistance(
            $latitude,
            $longitude,
            (float) $branch->latitude,
            (float) $branch->longitude
        );

        $isWithinRadius = $distance <= $branch->allowed_radius_meters;
        $isGpsAccuracyAcceptable = is_null($gpsAccuracy) || $gpsAccuracy <= self::MAX_GPS_ACCURACY_METERS;

        return [
            'is_valid' => $isWithinRadius && $isGpsAccuracyAcceptable,
            'distance_meters' => $distance,
            'allowed_radius_meters' => $branch->allowed_radius_meters,
            'within_radius' => $isWithinRadius,
            'gps_accuracy_acceptable' => $isGpsAccuracyAcceptable,
            'gps_accuracy_meters' => $gpsAccuracy,
            'branch_id' => $branch->id,
            'branch_name' => $branch->name,
            'branch_latitude' => (float) $branch->latitude,
            'branch_longitude' => (float) $branch->longitude,
            'failure_reason' => $this->determineFailureReason($isWithinRadius, $isGpsAccuracyAcceptable),
        ];
    }

    /**
     * Find the closest valid branch for a user
     * 
     * @param float $latitude User's latitude
     * @param float $longitude User's longitude
     * @param User $user The user
     * @param float|null $gpsAccuracy GPS accuracy
     * @return array|null Validation result or null if no valid branch
     */
    public function findClosestValidBranch(
        float $latitude,
        float $longitude,
        User $user,
        ?float $gpsAccuracy = null
    ): ?array {
        $assignments = $user->branchAssignments()
            ->active()
            ->effectiveOn()
            ->with('branch')
            ->get();

        if ($assignments->isEmpty()) {
            return null;
        }

        $closestBranch = null;
        $closestDistance = PHP_INT_MAX;
        $validBranch = null;

        foreach ($assignments as $assignment) {
            $branch = $assignment->branch;
            
            if (!$branch || !$branch->is_active) {
                continue;
            }

            $validation = $this->validateLocation($latitude, $longitude, $branch, $gpsAccuracy);
            
            if ($validation['distance_meters'] < $closestDistance) {
                $closestDistance = $validation['distance_meters'];
                $closestBranch = $validation;
            }

            if ($validation['is_valid'] && !$validBranch) {
                $validBranch = $validation;
            }
        }

        // Return valid branch if found, otherwise closest branch (for error message)
        return $validBranch ?? $closestBranch;
    }

    /**
     * Validate check-in time against settings
     * 
     * @param Branch $branch The branch
     * @param Carbon|null $time The time to validate (defaults to now)
     * @return array Validation result
     */
    public function validateCheckInTime(Branch $branch, ?Carbon $time = null): array
    {
        $time = $time ?? now();
        $settings = $branch->getEffectiveTimeSettings($time->toDateString());

        if (!$settings) {
            // Default settings if none found
            $checkInStart = Carbon::parse('08:00:00');
            $checkInEnd = Carbon::parse('09:30:00');
            $graceMinutes = 15;
            $lateThreshold = 15;
            $halfDayThreshold = 120;
        } else {
            $checkInStart = Carbon::parse($settings->check_in_start_time);
            $checkInEnd = Carbon::parse($settings->check_in_end_time);
            $graceMinutes = $settings->grace_period_minutes;
            $lateThreshold = $settings->late_threshold_minutes;
            $halfDayThreshold = $settings->half_day_threshold_minutes;
        }

        // Set dates to today for comparison
        $checkInStart = $time->copy()->setTimeFrom($checkInStart);
        $checkInEnd = $time->copy()->setTimeFrom($checkInEnd);
        $checkInEndWithGrace = $checkInEnd->copy()->addMinutes($graceMinutes);

        $isBeforeWindow = $time->lt($checkInStart);
        $isAfterWindow = $time->gt($checkInEnd);
        $isWithinGrace = $time->gt($checkInEnd) && $time->lte($checkInEndWithGrace);
        $isWithinWindow = $time->gte($checkInStart) && $time->lte($checkInEnd);

        // Calculate late minutes
        $lateMinutes = 0;
        if ($time->gt($checkInStart->copy()->addMinutes($lateThreshold))) {
            $lateMinutes = $time->diffInMinutes($checkInStart);
        }

        // Determine status
        $status = 'present';
        $isLate = false;

        if ($lateMinutes > 0 && $lateMinutes < $halfDayThreshold) {
            $status = 'late';
            $isLate = true;
        } elseif ($lateMinutes >= $halfDayThreshold) {
            $status = 'half_day';
            $isLate = true;
        }

        $canCheckIn = $isWithinWindow || $isWithinGrace || ($isAfterWindow && $lateMinutes < $halfDayThreshold * 2);

        return [
            'can_check_in' => $canCheckIn,
            'is_before_window' => $isBeforeWindow,
            'is_after_window' => $isAfterWindow,
            'is_within_window' => $isWithinWindow,
            'is_within_grace' => $isWithinGrace,
            'is_late' => $isLate,
            'late_minutes' => $lateMinutes,
            'status' => $status,
            'check_in_window' => [
                'start' => $checkInStart->format('H:i'),
                'end' => $checkInEnd->format('H:i'),
            ],
            'grace_period_minutes' => $graceMinutes,
            'failure_reason' => $isBeforeWindow ? 'before_window' : ($canCheckIn ? null : 'after_window'),
        ];
    }

    /**
     * Validate check-out time against settings
     * 
     * @param Branch $branch The branch
     * @param Attendance $attendance The attendance record
     * @param Carbon|null $time The time to validate (defaults to now)
     * @return array Validation result
     */
    public function validateCheckOutTime(Branch $branch, Attendance $attendance, ?Carbon $time = null): array
    {
        $time = $time ?? now();
        $settings = $branch->getEffectiveTimeSettings($time->toDateString());

        if (!$settings) {
            $checkOutStart = Carbon::parse('17:00:00');
            $checkOutEnd = Carbon::parse('19:00:00');
            $minimumHours = 8.0;
        } else {
            $checkOutStart = Carbon::parse($settings->check_out_start_time);
            $checkOutEnd = Carbon::parse($settings->check_out_end_time);
            $minimumHours = $settings->minimum_working_hours;
        }

        // Set dates to today for comparison
        $checkOutStart = $time->copy()->setTimeFrom($checkOutStart);
        $checkOutEnd = $time->copy()->setTimeFrom($checkOutEnd);

        $isBeforeWindow = $time->lt($checkOutStart);
        $isAfterWindow = $time->gt($checkOutEnd);
        $isWithinWindow = $time->gte($checkOutStart) && $time->lte($checkOutEnd);

        // Calculate working hours
        $checkInTime = Carbon::parse($attendance->in_time);
        $workingHours = $time->diffInMinutes($checkInTime) / 60;

        // Check if early leave
        $isEarlyLeave = $workingHours < $minimumHours;
        $earlyMinutes = $isEarlyLeave ? (int) (($minimumHours * 60) - ($workingHours * 60)) : 0;

        // Allow check-out even outside window, but record it
        $canCheckOut = true;

        return [
            'can_check_out' => $canCheckOut,
            'is_before_window' => $isBeforeWindow,
            'is_after_window' => $isAfterWindow,
            'is_within_window' => $isWithinWindow,
            'is_early_leave' => $isEarlyLeave,
            'early_minutes' => $earlyMinutes,
            'working_hours' => round($workingHours, 2),
            'minimum_hours' => $minimumHours,
            'check_out_window' => [
                'start' => $checkOutStart->format('H:i'),
                'end' => $checkOutEnd->format('H:i'),
            ],
        ];
    }

    /**
     * Check if user has already checked in today
     * 
     * @param User $user
     * @param string|null $date Date to check (defaults to today)
     * @return Attendance|null
     */
    public function getTodayAttendance(User $user, ?string $date = null): ?Attendance
    {
        $date = $date ?? now()->toDateString();

        return Attendance::where('user_id', $user->id)
            ->whereDate('date', $date)
            ->where('attendance_method', Attendance::METHOD_GPS_APP)
            ->first();
    }

    /**
     * Log a GPS validation failure
     * 
     * @param User $user
     * @param Branch $branch
     * @param array $validationResult
     * @param array $deviceInfo
     * @param string|null $ipAddress
     * @param float|null $gpsAccuracy
     */
    public function logValidationFailure(
        User $user,
        Branch $branch,
        array $validationResult,
        array $deviceInfo = [],
        ?string $ipAddress = null,
        ?float $gpsAccuracy = null
    ): void {
        GpsValidationFailure::create([
            'user_id' => $user->id,
            'branch_id' => $branch->id,
            'attempted_latitude' => request()->input('latitude'),
            'attempted_longitude' => request()->input('longitude'),
            'branch_latitude' => $branch->latitude,
            'branch_longitude' => $branch->longitude,
            'calculated_distance_meters' => $validationResult['distance_meters'],
            'allowed_radius_meters' => $validationResult['allowed_radius_meters'],
            'distance_exceeded_by_meters' => max(0, $validationResult['distance_meters'] - $validationResult['allowed_radius_meters']),
            'failure_type' => $validationResult['failure_reason'] ?? 'outside_radius',
            'gps_accuracy_meters' => $gpsAccuracy,
            'device_info' => $deviceInfo,
            'ip_address' => $ipAddress,
            'attempt_time' => now(),
            'created_at' => now(),
        ]);
    }

    /**
     * Log an audit entry
     * 
     * @param string $action
     * @param User $user
     * @param Branch|null $branch
     * @param Attendance|null $attendance
     * @param array $data
     */
    public function logAudit(
        string $action,
        User $user,
        ?Branch $branch = null,
        ?Attendance $attendance = null,
        array $data = []
    ): void {
        AttendanceAuditLog::create([
            'attendance_id' => $attendance?->id,
            'user_id' => $user->id,
            'branch_id' => $branch?->id,
            'action' => $action,
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'distance_from_branch_meters' => $data['distance_meters'] ?? null,
            'failure_reason' => $data['failure_reason'] ?? null,
            'validation_details' => $data['validation_details'] ?? null,
            'device_info' => $data['device_info'] ?? null,
            'ip_address' => $data['ip_address'] ?? null,
            'user_agent' => $data['user_agent'] ?? null,
            'performed_by' => $data['performed_by'] ?? null,
            'notes' => $data['notes'] ?? null,
            'created_at' => now(),
        ]);
    }

    /**
     * Determine failure reason
     */
    private function determineFailureReason(bool $withinRadius, bool $accuracyAcceptable): ?string
    {
        if (!$withinRadius) {
            return 'outside_radius';
        }
        
        if (!$accuracyAcceptable) {
            return 'gps_accuracy_low';
        }

        return null;
    }

    /**
     * Create a department-based check-in with GPS validation
     * For Finance department and other departments
     * 
     * @param User $user
     * @param int $departmentId
     * @param float $latitude
     * @param float $longitude
     * @param float|null $gpsAccuracy
     * @param array $deviceInfo
     * @param string|null $ipAddress
     * @param string|null $userAgent
     * @param \App\Models\DepartmentAttendanceSetting|null $deptSettings
     * @return Attendance|null
     */
    public function createDepartmentCheckIn(
        User $user,
        int $departmentId,
        float $latitude,
        float $longitude,
        ?float $gpsAccuracy = null,
        array $deviceInfo = [],
        ?string $ipAddress = null,
        ?string $userAgent = null,
        ?\App\Models\DepartmentAttendanceSetting $deptSettings = null
    ): ?Attendance {
        try {
            // Get department settings for late calculation if not provided
            if (!$deptSettings) {
                $deptSettings = \App\Models\DepartmentAttendanceSetting::where('department_id', $departmentId)
                    ->where('is_active', true)
                    ->first();
            }
            
            $now = now();
            $isLate = false;
            $lateByMinutes = 0;
            $distanceMeters = null;
            
            if ($deptSettings) {
                $workStartTime = Carbon::parse($deptSettings->work_start_time);
                $graceMinutes = $deptSettings->late_grace_minutes ?? 15;
                $lateThreshold = $workStartTime->copy()->addMinutes($graceMinutes);
                
                if ($now->format('H:i:s') > $lateThreshold->format('H:i:s')) {
                    $isLate = true;
                    $lateByMinutes = $now->diffInMinutes($workStartTime);
                }

                // Calculate distance if location is configured
                if ($deptSettings->hasLocationConfigured()) {
                    $distanceMeters = $this->calculateDistance(
                        $latitude,
                        $longitude,
                        (float) $deptSettings->latitude,
                        (float) $deptSettings->longitude
                    );
                }
            }

            // Create attendance record
            $attendance = Attendance::create([
                'user_id' => $user->id,
                'branch_id' => null, // No physical branch for department-based attendance
                'department_id' => $departmentId,
                'date' => $now->toDateString(),
                'check_in_timestamp' => $now,
                'in_time' => $now,
                'check_in_latitude' => $latitude,
                'check_in_longitude' => $longitude,
                'check_in_gps_accuracy' => $gpsAccuracy,
                'check_in_distance_meters' => $distanceMeters,
                'check_in_device_info' => $deviceInfo,
                'check_in_ip_address' => $ipAddress,
                'check_in_user_agent' => $userAgent,
                'verified_branch_name' => $deptSettings?->location_name,
                'verified_branch_address' => $deptSettings?->address,
                'verified_branch_city' => $deptSettings?->city,
                'attendance_status' => $isLate ? 'late' : 'present',
                'location_verified' => true,
                'at_assigned_location' => true,
                'is_late' => $isLate,
                'late_by_minutes' => $lateByMinutes,
                'is_department_based' => true,
            ]);

            // Log the check-in
            $this->logAudit(
                AttendanceAuditLog::ACTION_CHECK_IN,
                $user,
                $attendance,
                null,
                [
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'gps_accuracy' => $gpsAccuracy,
                    'distance_meters' => $distanceMeters,
                    'device_info' => $deviceInfo,
                    'ip_address' => $ipAddress,
                    'user_agent' => $userAgent,
                    'is_department_based' => true,
                    'department_id' => $departmentId,
                    'department_location' => $deptSettings?->location_name,
                ]
            );

            return $attendance;
        } catch (\Exception $e) {
            Log::error('Department check-in failed', [
                'user_id' => $user->id,
                'department_id' => $departmentId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Check for suspicious patterns (velocity check)
     * 
     * @param User $user
     * @param float $latitude
     * @param float $longitude
     * @return bool True if suspicious
     */
    public function checkSuspiciousPattern(User $user, float $latitude, float $longitude): bool
    {
        // Get last audit log for this user
        $lastLog = AttendanceAuditLog::where('user_id', $user->id)
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$lastLog) {
            return false;
        }

        // Calculate time difference
        $timeDiff = now()->diffInMinutes($lastLog->created_at);
        
        if ($timeDiff < 1) {
            $timeDiff = 1; // Prevent division by zero
        }

        // Calculate distance
        $distance = $this->calculateDistance(
            (float) $lastLog->latitude,
            (float) $lastLog->longitude,
            $latitude,
            $longitude
        );

        // Calculate speed in km/h
        $speedKmh = ($distance / 1000) / ($timeDiff / 60);

        // Flag if speed exceeds 200 km/h (impossible for normal commute)
        return $speedKmh > 200;
    }
}
