import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import {
  checkAccess,
  checkIn,
  checkOut,
  getTodayStatus,
  getMyHistory,
  getMyStatistics,
  requestCorrection,
  getMyCorrections,
  withdrawCorrection,
  getCurrentPosition,
  isGeolocationAvailable,
  getDeviceInfo,
  formatDistance,
} from '../services/gpsAttendanceService';
import {
  MapPinIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, MapPinIcon as MapPinSolid } from '@heroicons/react/24/solid';

const GpsAttendance = () => {
  const { user } = useAuthStore();
  
  // Access state
  const [accessInfo, setAccessInfo] = useState(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);
  
  // Location state
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Attendance state
  const [todayStatus, setTodayStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  
  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  
  // History state
  const [history, setHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [corrections, setCorrections] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('attendance');
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    correction_type: 'check_in_time',
    requested_check_in: '',
    requested_check_out: '',
    reason: '',
  });

  // Time state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Check access on mount
  useEffect(() => {
    const loadAccess = async () => {
      try {
        setAccessLoading(true);
        const data = await checkAccess();
        setAccessInfo(data);
        
        if (data.can_mark_attendance) {
          await loadTodayStatus();
        }
      } catch (err) {
        setAccessError(err.response?.data?.message || 'Failed to check access');
      } finally {
        setAccessLoading(false);
      }
    };
    
    loadAccess();
  }, []);

  // Load today's status
  const loadTodayStatus = async () => {
    try {
      setStatusLoading(true);
      const data = await getTodayStatus();
      setTodayStatus(data);
    } catch (err) {
      console.error('Failed to load today status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  // Get current location
  const getLocation = useCallback(async () => {
    if (!isGeolocationAvailable()) {
      setLocationError('Geolocation not supported');
      setActionResult({ success: false, message: 'Geolocation is not supported by your browser.' });
      return null;
    }

    try {
      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        if (permissionStatus.state === 'denied') {
          setLocationError('Location access denied');
          setActionResult({ success: false, message: '📍 Location Access Denied\n\nPlease enable location permissions.' });
          return null;
        }
      }
    } catch (permErr) {}

    try {
      setLocationLoading(true);
      setLocationError(null);
      
      const position = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
      
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      
      setLocation(coords);
      return coords;
    } catch (err) {
      let errorMessage = 'Failed to get location';
      let userMessage = '📍 Location Error\n\nCould not get your location.';
      
      switch (err.code) {
        case 1:
          errorMessage = 'Location access denied';
          userMessage = '📍 Location Denied\n\n1. Turn ON GPS\n2. Allow location access';
          break;
        case 2:
          errorMessage = 'Location unavailable';
          userMessage = '📍 Location Unavailable\n\nTurn ON your GPS.';
          break;
        case 3:
          errorMessage = 'Location timed out';
          userMessage = '📍 Timed Out\n\nCheck GPS signal.';
          break;
      }
      
      setLocationError(errorMessage);
      setActionResult({ success: false, message: userMessage });
      return null;
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // Handle check-in
  const handleCheckIn = async () => {
    // Check for branch assignment OR department-based attendance
    const isDepartmentBased = accessInfo?.primary_branch?.is_department_based || accessInfo?.department_attendance;
    
    if (!accessInfo?.primary_branch && !isDepartmentBased) {
      setActionResult({ success: false, message: 'No branch or department assigned for attendance.' });
      return;
    }

    // Check if GPS is required for this user's department
    const gpsRequired = accessInfo?.primary_branch?.gps_required !== false && 
                        accessInfo?.department_attendance?.gps_required !== false;

    try {
      setActionLoading(true);
      setActionResult(null);
      
      let coords = null;
      
      // Only get location if GPS is required
      if (gpsRequired) {
        coords = await getLocation();
        if (!coords) return;
      }

      const data = {
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        gps_accuracy: coords?.accuracy || null,
        device_info: getDeviceInfo(),
        is_department_based: isDepartmentBased,
        department_id: accessInfo?.department_attendance?.department_id || accessInfo?.primary_branch?.department_id,
      };

      const result = await checkIn(data);
      setActionResult({ 
        success: true, 
        message: result.message || 'Check-in successful! 🎉', 
        data: { 
          attendance: result.attendance,
          location_tracking: result.location_tracking 
        }
      });
      await loadTodayStatus();
    } catch (err) {
      const errorData = err.response?.data;
      setActionResult({
        success: false,
        message: errorData?.message || 'Check-in failed',
        distance: errorData?.distance,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    if (!todayStatus?.attendance?.id) {
      setActionResult({ success: false, message: 'No check-in record found.' });
      return;
    }

    // Check if GPS is required for this user's department
    const gpsRequired = accessInfo?.primary_branch?.gps_required !== false && 
                        accessInfo?.department_attendance?.gps_required !== false;

    try {
      setActionLoading(true);
      setActionResult(null);
      
      let coords = null;
      
      // Only get location if GPS is required
      if (gpsRequired) {
        coords = await getLocation();
        if (!coords) return;
      }

      const data = {
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        gps_accuracy: coords?.accuracy || null,
        attendance_id: todayStatus.attendance.id,
        device_info: getDeviceInfo(),
      };

      const result = await checkOut(data);
      setActionResult({ 
        success: true, 
        message: result.message || 'Check-out successful! 👋', 
        data: { 
          attendance: result.attendance,
          location_tracking: result.location_tracking 
        }
      });
      await loadTodayStatus();
    } catch (err) {
      const errorData = err.response?.data;
      setActionResult({
        success: false,
        message: errorData?.message || 'Check-out failed',
        distance: errorData?.distance,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Load history
  const loadHistory = async () => {
    try {
      const data = await getMyHistory({
        date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        date_to: new Date().toISOString().split('T')[0],
        per_page: 30,
      });
      setHistory(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      setHistory([]);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const now = new Date();
      const data = await getMyStatistics({ month: now.getMonth() + 1, year: now.getFullYear() });
      setStatistics(data);
    } catch (err) {}
  };

  // Load corrections
  const loadCorrections = async () => {
    try {
      const data = await getMyCorrections({ status: 'all' });
      setCorrections(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      setCorrections([]);
    }
  };

  // Handle tab change
  useEffect(() => {
    if (activeTab === 'history' && history.length === 0) loadHistory();
    else if (activeTab === 'statistics' && !statistics) loadStatistics();
    else if (activeTab === 'corrections') loadCorrections();
  }, [activeTab]);

  // Submit correction
  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!selectedAttendance) return;
    
    try {
      setActionLoading(true);
      await requestCorrection({ attendance_id: selectedAttendance.id, ...correctionForm });
      setShowCorrectionModal(false);
      setCorrectionForm({ correction_type: 'check_in_time', requested_check_in: '', requested_check_out: '', reason: '' });
      setSelectedAttendance(null);
      loadCorrections();
      setActionResult({ success: true, message: 'Correction request submitted.' });
    } catch (err) {
      setActionResult({ success: false, message: err.response?.data?.message || 'Failed to submit.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Withdraw correction
  const handleWithdrawCorrection = async (correctionId) => {
    if (!window.confirm('Withdraw this request?')) return;
    try {
      await withdrawCorrection(correctionId);
      loadCorrections();
    } catch (err) {
      alert('Failed to withdraw');
    }
  };

  // Loading state
  if (accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center p-8">
          <div className="relative w-20 h-20 mx-auto">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <MapPinSolid className="h-10 w-10 text-blue-600 animate-bounce" />
            </div>
            <div className="absolute inset-0 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading GPS Attendance...</p>
        </div>
      </div>
    );
  }

  // Admin exemption view - admins don't need to mark GPS attendance
  if (accessError || !accessInfo?.can_mark_attendance) {
    if (accessInfo?.attendance_role === 'admin_procurement' || accessInfo?.is_admin_exempt) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 sm:p-6">
          <div className="max-w-lg mx-auto space-y-6">
            {/* Admin Header */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 sm:p-8 text-white text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4">
                  <ShieldCheckIcon className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold">Admin Access</h2>
                <p className="mt-2 text-purple-100 text-sm">You are exempt from GPS attendance marking</p>
              </div>
            </div>

            {/* Admin Exempt Notice */}
            <div className="bg-white rounded-3xl shadow-xl p-5 sm:p-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircleSolid className="h-10 w-10 text-green-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No GPS Attendance Required</h3>
                <p className="text-gray-500 text-sm">As an administrator, you are not required to mark GPS-based attendance.</p>
                <p className="text-gray-400 text-xs mt-2">Your attendance is managed through the traditional system.</p>
              </div>
            </div>

            <a href="/dashboard/attendances" className="block w-full text-center py-4 text-purple-600 font-semibold bg-white rounded-2xl shadow-lg hover:shadow-xl">
              Go to Attendance Admin Panel →
            </a>
            
            <a href="/dashboard" className="block w-full text-center py-4 text-gray-600 font-semibold bg-white rounded-2xl shadow-lg hover:shadow-xl">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-white text-center">
            <XCircleIcon className="h-16 w-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Access Denied</h2>
          </div>
          <div className="p-6">
            <p className="text-gray-600 text-center">{accessError || 'You do not have permission to mark GPS attendance.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const primaryBranch = accessInfo?.primary_branch;
  const hasCheckedIn = todayStatus?.attendance?.has_checked_in;
  const hasCheckedOut = todayStatus?.attendance?.has_checked_out;
  const isGpsRequired = accessInfo?.gps_attendance_required;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
        
        <div className="relative z-10 px-4 sm:px-6 pt-6 pb-32 sm:pb-36">
          <div className="max-w-lg mx-auto">
            {/* Badges */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                {isGpsRequired && (
                  <span className="px-3 py-1.5 bg-red-500/90 backdrop-blur-sm rounded-full text-xs font-semibold flex items-center shadow-lg text-white">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5 mr-1" />
                    Required
                  </span>
                )}
              </div>
              <button onClick={loadTodayStatus} disabled={statusLoading} className="p-2 hover:bg-white/10 rounded-xl text-white">
                <ArrowPathIcon className={`h-5 w-5 ${statusLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Greeting */}
            <div className="text-white">
              <p className="text-blue-100 text-sm font-medium">{getGreeting()}</p>
              <h1 className="text-3xl sm:text-4xl font-bold mt-1">{user?.name?.split(' ')[0] || 'User'}</h1>
              <div className="mt-3 flex items-center text-blue-100 flex-wrap gap-2">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  <span className="text-lg font-mono">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <span className="hidden sm:inline">•</span>
                <span className="text-sm">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>

            {primaryBranch && (
              <div className="mt-4 inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-white">
                <BuildingOffice2Icon className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">
                  {primaryBranch.is_department_based ? `${primaryBranch.name} (Dept)` : primaryBranch.name}
                </span>
              </div>
            )}
            {!primaryBranch && accessInfo?.department_attendance && (
              <div className="mt-4 inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-xl text-white">
                <BuildingOffice2Icon className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">{accessInfo.department_attendance.department_name} (Dept)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto -mt-24 px-4 pb-8 relative z-20">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6">
          <div className="p-5 sm:p-6 pb-4">
            {/* Status Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Today's Status</h2>
                {todayStatus?.attendance?.attendance_status && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mt-2 ${
                    todayStatus.attendance.attendance_status === 'present' ? 'bg-green-100 text-green-700' :
                    todayStatus.attendance.attendance_status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {todayStatus.attendance.attendance_status === 'present' ? '✓ Present' : todayStatus.attendance.attendance_status === 'late' ? '⏰ Late' : todayStatus.attendance.attendance_status}
                  </span>
                )}
              </div>
              <div className="flex items-center text-green-500 text-xs font-medium">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live
              </div>
            </div>

            {/* Time Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
              <div className={`relative p-4 sm:p-5 rounded-2xl transition-all ${hasCheckedIn ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-100'}`}>
                {hasCheckedIn && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircleSolid className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className="flex items-center mb-2">
                  <ArrowRightOnRectangleIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${hasCheckedIn ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="ml-2 text-xs font-semibold text-gray-500 uppercase">Check-in</span>
                </div>
                {hasCheckedIn ? (
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono">{todayStatus.attendance.check_in_time}</p>
                ) : (
                  <p className="text-xl text-gray-300 font-medium">--:--</p>
                )}
              </div>
              
              <div className={`relative p-4 sm:p-5 rounded-2xl transition-all ${hasCheckedOut ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200' : 'bg-gray-50 border-2 border-gray-100'}`}>
                {hasCheckedOut && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircleSolid className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className="flex items-center mb-2">
                  <ArrowLeftOnRectangleIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${hasCheckedOut ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="ml-2 text-xs font-semibold text-gray-500 uppercase">Check-out</span>
                </div>
                {hasCheckedOut ? (
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 font-mono">{todayStatus.attendance.check_out_time}</p>
                ) : (
                  <p className="text-xl text-gray-300 font-medium">--:--</p>
                )}
              </div>
            </div>

            {/* Working Hours */}
            {todayStatus?.attendance?.working_hours && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-semibold text-blue-700">Working Hours</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-900">{todayStatus.attendance.working_hours}h</span>
                </div>
              </div>
            )}

            {/* Location */}
            {location && (
              <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl mb-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center text-gray-600">
                    <MapPinSolid className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-mono">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
                  </div>
                  {location.accuracy && (
                    <span className="text-xs text-gray-400 flex items-center">
                      <SignalIcon className="h-3 w-3 mr-1" />
                      ±{Math.round(location.accuracy)}m
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Result */}
            {actionResult && (
              <div className={`p-4 rounded-2xl mb-6 ${actionResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start">
                  {actionResult.success ? <CheckCircleSolid className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /> : <XCircleIcon className="h-6 w-6 text-red-500 mr-3 flex-shrink-0" />}
                  <div className="flex-1">
                    <span className={`text-sm font-semibold whitespace-pre-line ${actionResult.success ? 'text-green-700' : 'text-red-700'}`}>{actionResult.message}</span>
                    {actionResult.distance && <p className="mt-1 text-xs text-gray-500">Distance: {formatDistance(actionResult.distance)}</p>}
                    
                    {/* Show location tracking info for successful check-in/out */}
                    {actionResult.success && actionResult.data?.location_tracking && (
                      <div className="mt-3 p-3 bg-white/70 rounded-xl text-xs">
                        <div className="flex items-center text-green-600 mb-2">
                          <ShieldCheckIcon className="h-4 w-4 mr-1" />
                          <span className="font-semibold">Location Verified</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-gray-600">
                          <div>
                            <span className="text-gray-400">Showroom:</span>
                            <span className="ml-1 font-medium">{actionResult.data.location_tracking.verified_at}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Distance:</span>
                            <span className="ml-1 font-medium">{actionResult.data.location_tracking.distance_from_center}m</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-5 sm:px-6 pb-6">
            {!hasCheckedIn ? (
              <button onClick={handleCheckIn} disabled={actionLoading || locationLoading} className="w-full py-4 sm:py-5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center shadow-lg shadow-green-200 disabled:shadow-none">
                {actionLoading || locationLoading ? (
                  <><ArrowPathIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3 animate-spin" />{locationLoading ? 'Getting Location...' : 'Processing...'}</>
                ) : (
                  <><ArrowRightOnRectangleIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />Check In</>
                )}
              </button>
            ) : !hasCheckedOut ? (
              <button onClick={handleCheckOut} disabled={actionLoading || locationLoading} className="w-full py-4 sm:py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center shadow-lg shadow-blue-200 disabled:shadow-none">
                {actionLoading || locationLoading ? (
                  <><ArrowPathIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3 animate-spin" />{locationLoading ? 'Getting Location...' : 'Processing...'}</>
                ) : (
                  <><ArrowLeftOnRectangleIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />Check Out</>
                )}
              </button>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircleSolid className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
                </div>
                <p className="text-lg sm:text-xl font-bold text-gray-900">All Done!</p>
                <p className="text-gray-500 mt-1">Have a great day 👋</p>
              </div>
            )}

            {!location && !hasCheckedIn && !hasCheckedOut && (
              <button onClick={getLocation} disabled={locationLoading} className="w-full mt-3 py-3 sm:py-4 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-2xl font-semibold flex items-center justify-center">
                <MapPinIcon className="h-5 w-5 mr-2" />
                Get My Location
              </button>
            )}
          </div>
        </div>

        {/* Tabs Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[
              { id: 'attendance', label: 'Info', icon: BuildingOffice2Icon },
              { id: 'history', label: 'History', icon: CalendarDaysIcon },
              { id: 'statistics', label: 'Stats', icon: ChartBarIcon },
              { id: 'corrections', label: 'Requests', icon: DocumentTextIcon },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 sm:py-4 px-1 sm:px-2 text-xs sm:text-sm font-semibold flex flex-col items-center transition-all ${activeTab === tab.id ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
                <tab.icon className={`h-4 w-4 sm:h-5 sm:w-5 mb-1 ${activeTab === tab.id ? 'text-blue-600' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            {/* Info Tab */}
            {activeTab === 'attendance' && (
              <div className="space-y-4">
                {/* Location Tracking Info - Shows when checked in */}
                {todayStatus?.attendance?.location_tracking && (
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-green-200">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600" />
                      Location Verified ✓
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-white/80 rounded-xl">
                        <p className="text-gray-400 text-xs mb-1">Verified At</p>
                        <p className="font-bold text-green-700">{todayStatus.attendance.location_tracking.verified_branch}</p>
                        {todayStatus.attendance.location_tracking.verified_address && (
                          <p className="text-gray-500 text-xs mt-1">{todayStatus.attendance.location_tracking.verified_address}</p>
                        )}
                      </div>
                      
                      {todayStatus.attendance.location_tracking.check_in && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 bg-white/80 rounded-xl">
                            <p className="text-gray-400 text-xs mb-1">Check-in Distance</p>
                            <p className="font-semibold text-gray-900">{todayStatus.attendance.location_tracking.check_in.distance_meters}m</p>
                          </div>
                          <div className="p-3 bg-white/80 rounded-xl">
                            <p className="text-gray-400 text-xs mb-1">GPS Accuracy</p>
                            <p className="font-semibold text-gray-900">±{Math.round(todayStatus.attendance.location_tracking.check_in.gps_accuracy || 0)}m</p>
                          </div>
                        </div>
                      )}

                      {todayStatus.attendance.location_tracking.check_out && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 bg-white/80 rounded-xl">
                            <p className="text-gray-400 text-xs mb-1">Check-out Distance</p>
                            <p className="font-semibold text-gray-900">{todayStatus.attendance.location_tracking.check_out.distance_meters}m</p>
                          </div>
                          <div className="p-3 bg-white/80 rounded-xl">
                            <p className="text-gray-400 text-xs mb-1">Check-out Accuracy</p>
                            <p className="font-semibold text-gray-900">±{Math.round(todayStatus.attendance.location_tracking.check_out.gps_accuracy || 0)}m</p>
                          </div>
                        </div>
                      )}

                      {todayStatus.attendance.location_tracking.check_in?.latitude && (
                        <div className="p-3 bg-white/80 rounded-xl">
                          <p className="text-gray-400 text-xs mb-1">Check-in Coordinates</p>
                          <p className="font-mono text-xs text-gray-600">
                            {todayStatus.attendance.location_tracking.check_in.latitude?.toFixed(6)}, {todayStatus.attendance.location_tracking.check_in.longitude?.toFixed(6)}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-center pt-2">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${todayStatus.attendance.location_tracking.at_assigned_location ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {todayStatus.attendance.location_tracking.at_assigned_location ? (
                            <><CheckCircleSolid className="h-4 w-4 mr-1" />At Assigned Location</>
                          ) : (
                            <><XCircleIcon className="h-4 w-4 mr-1" />Location Mismatch</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {primaryBranch && (
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                      <BuildingOffice2Icon className="h-5 w-5 mr-2 text-blue-600" />
                      Branch Details
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
                      <div className="p-2 sm:p-3 bg-white rounded-xl">
                        <p className="text-gray-400 text-xs mb-1">Name</p>
                        <p className="font-semibold text-gray-900 text-sm">{primaryBranch.name}</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-white rounded-xl">
                        <p className="text-gray-400 text-xs mb-1">Code</p>
                        <p className="font-semibold text-gray-900 text-sm">{primaryBranch.code}</p>
                      </div>
                      <div className="col-span-2 p-2 sm:p-3 bg-white rounded-xl">
                        <p className="text-gray-400 text-xs mb-1">Address</p>
                        <p className="font-semibold text-gray-900 text-sm">{primaryBranch.address}</p>
                      </div>
                      <div className="p-2 sm:p-3 bg-white rounded-xl">
                        <p className="text-gray-400 text-xs mb-1">GPS Radius</p>
                        <p className="font-semibold text-gray-900 text-sm">{primaryBranch.allowed_radius_meters}m</p>
                      </div>
                    </div>
                  </div>
                )}

                {accessInfo?.time_settings && (
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                      <ClockIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Time Settings
                    </h3>
                    <div className="space-y-2 sm:space-y-3 text-sm">
                      <div className="flex justify-between items-center p-2 sm:p-3 bg-white rounded-xl">
                        <span className="text-gray-500 text-xs sm:text-sm">Check-in</span>
                        <span className="font-bold text-gray-900 text-xs sm:text-sm">{accessInfo.time_settings.check_in_start} - {accessInfo.time_settings.check_in_end}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 sm:p-3 bg-white rounded-xl">
                        <span className="text-gray-500 text-xs sm:text-sm">Check-out</span>
                        <span className="font-bold text-gray-900 text-xs sm:text-sm">{accessInfo.time_settings.check_out_start} - {accessInfo.time_settings.check_out_end}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 sm:p-3 bg-white rounded-xl">
                        <span className="text-gray-500 text-xs sm:text-sm">Grace Period</span>
                        <span className="font-bold text-gray-900 text-xs sm:text-sm">{accessInfo.time_settings.grace_period_minutes} min</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-3 max-h-[350px] sm:max-h-[400px] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDaysIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No history found</p>
                  </div>
                ) : (
                  history.map((record) => (
                    <div key={record.id} className="p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-gray-900 text-sm sm:text-base">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span className={`text-xs px-2 sm:px-3 py-1 rounded-full font-semibold ${record.attendance_status === 'present' ? 'bg-green-100 text-green-700' : record.attendance_status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>{record.attendance_status}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center text-gray-600">
                          <ArrowRightOnRectangleIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-green-500" />
                          {record.check_in_time || '--:--'}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <ArrowLeftOnRectangleIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-blue-500" />
                          {record.check_out_time || '--:--'}
                        </div>
                        {record.working_hours && <span className="font-semibold text-gray-900">{record.working_hours}h</span>}
                      </div>
                      <button onClick={() => { setSelectedAttendance(record); setShowCorrectionModal(true); }} className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-semibold">Request Correction →</button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'statistics' && statistics && (
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-center">{statistics.period}</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl text-center border border-green-100">
                    <p className="text-3xl sm:text-4xl font-black text-green-600">{statistics.summary?.present_days || 0}</p>
                    <p className="text-xs font-semibold text-green-600 mt-1">Present</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl text-center border border-amber-100">
                    <p className="text-3xl sm:text-4xl font-black text-amber-600">{statistics.summary?.late_days || 0}</p>
                    <p className="text-xs font-semibold text-amber-600 mt-1">Late</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl text-center border border-blue-100">
                    <p className="text-3xl sm:text-4xl font-black text-blue-600">{statistics.summary?.total_working_hours?.toFixed(0) || 0}</p>
                    <p className="text-xs font-semibold text-blue-600 mt-1">Hours</p>
                  </div>
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl text-center border border-purple-100">
                    <p className="text-3xl sm:text-4xl font-black text-purple-600">{statistics.summary?.attendance_rate?.toFixed(0) || 0}%</p>
                    <p className="text-xs font-semibold text-purple-600 mt-1">Rate</p>
                  </div>
                </div>
              </div>
            )}

            {/* Corrections Tab */}
            {activeTab === 'corrections' && (
              <div className="space-y-3 max-h-[350px] sm:max-h-[400px] overflow-y-auto pr-1">
                {corrections.length === 0 ? (
                  <div className="text-center py-12">
                    <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No correction requests</p>
                  </div>
                ) : (
                  corrections.map((correction) => (
                    <div key={correction.id} className="p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-900 text-sm">{correction.attendance?.date}</span>
                        <span className={`text-xs px-2 sm:px-3 py-1 rounded-full font-semibold ${correction.status === 'pending' ? 'bg-amber-100 text-amber-700' : correction.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{correction.status}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2">{correction.reason}</p>
                      {correction.status === 'pending' && <button onClick={() => handleWithdrawCorrection(correction.id)} className="text-xs text-red-600 hover:text-red-700 font-semibold">Withdraw</button>}
                      {correction.status === 'rejected' && correction.review_notes && <p className="text-xs text-red-600 mt-1 p-2 bg-red-50 rounded-lg">Reason: {correction.review_notes}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Correction Modal */}
      {showCorrectionModal && selectedAttendance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-5 sm:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Request Correction</h3>
                <button onClick={() => { setShowCorrectionModal(false); setSelectedAttendance(null); }} className="p-2 hover:bg-gray-100 rounded-xl">
                  <XCircleIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Date: <span className="font-semibold text-gray-700">{selectedAttendance.date}</span></p>
            </div>

            <form onSubmit={handleSubmitCorrection} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                <select value={correctionForm.correction_type} onChange={(e) => setCorrectionForm({ ...correctionForm, correction_type: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-0" required>
                  <option value="check_in_time">Check-in Time</option>
                  <option value="check_out_time">Check-out Time</option>
                  <option value="both">Both Times</option>
                </select>
              </div>

              {(correctionForm.correction_type === 'check_in_time' || correctionForm.correction_type === 'both') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Check-in Time</label>
                  <input type="time" value={correctionForm.requested_check_in} onChange={(e) => setCorrectionForm({ ...correctionForm, requested_check_in: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-0" required />
                </div>
              )}

              {(correctionForm.correction_type === 'check_out_time' || correctionForm.correction_type === 'both') && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Check-out Time</label>
                  <input type="time" value={correctionForm.requested_check_out} onChange={(e) => setCorrectionForm({ ...correctionForm, requested_check_out: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-0" required />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reason</label>
                <textarea value={correctionForm.reason} onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-0 resize-none" rows={3} required minLength={10} placeholder="Explain why you need this correction..." />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button type="button" onClick={() => { setShowCorrectionModal(false); setSelectedAttendance(null); }} className="py-3 sm:py-4 border-2 border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={actionLoading} className="py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold disabled:from-gray-300 disabled:to-gray-400">{actionLoading ? 'Submitting...' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GpsAttendance;
