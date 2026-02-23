// GPS Attendance Service
// Handles all GPS-based attendance operations for the CameraLK PWA

import api from './api';

// =====================================================
// GPS ATTENDANCE - EMPLOYEE ENDPOINTS
// =====================================================

/**
 * Check current user's attendance access level
 */
export const checkAccess = async () => {
  const response = await api.get('/gps-attendance/access');
  return response.data;
};

/**
 * Check in at current location
 * @param {Object} data - Check-in data
 * @param {number} data.latitude - Current latitude
 * @param {number} data.longitude - Current longitude
 * @param {number} data.branch_id - Branch ID to check in at
 * @param {Object} data.device_info - Device information (optional)
 */
export const checkIn = async (data) => {
  const response = await api.post('/gps-attendance/check-in', data);
  return response.data;
};

/**
 * Check out at current location
 * @param {Object} data - Check-out data
 * @param {number} data.latitude - Current latitude
 * @param {number} data.longitude - Current longitude
 * @param {number} data.attendance_id - Attendance record ID
 * @param {Object} data.device_info - Device information (optional)
 */
export const checkOut = async (data) => {
  const response = await api.post('/gps-attendance/check-out', data);
  return response.data;
};

/**
 * Get today's attendance status
 */
export const getTodayStatus = async () => {
  const response = await api.get('/gps-attendance/today');
  return response.data;
};

/**
 * Validate location before check-in/check-out
 * @param {Object} data - Location data
 * @param {number} data.latitude - Current latitude
 * @param {number} data.longitude - Current longitude
 * @param {number} data.branch_id - Branch ID to validate against
 */
export const validateLocation = async (data) => {
  const response = await api.post('/gps-attendance/validate-location', data);
  return response.data;
};

/**
 * Get personal attendance history
 * @param {Object} params - Query parameters
 * @param {string} params.date_from - Start date (YYYY-MM-DD)
 * @param {string} params.date_to - End date (YYYY-MM-DD)
 * @param {number} params.page - Page number
 * @param {number} params.per_page - Items per page
 */
export const getMyHistory = async (params = {}) => {
  const response = await api.get('/gps-attendance/my-history', { params });
  return response.data;
};

/**
 * Get personal attendance statistics
 * @param {Object} params - Query parameters
 * @param {number} params.month - Month (1-12)
 * @param {number} params.year - Year
 */
export const getMyStatistics = async (params = {}) => {
  const response = await api.get('/gps-attendance/my-statistics', { params });
  return response.data;
};

/**
 * Submit a correction request
 * @param {Object} data - Correction request data
 * @param {number} data.attendance_id - Attendance record ID
 * @param {string} data.correction_type - Type: 'check_in_time', 'check_out_time', 'both'
 * @param {string} data.requested_check_in - Requested check-in time (HH:mm:ss)
 * @param {string} data.requested_check_out - Requested check-out time (HH:mm:ss)
 * @param {string} data.reason - Reason for correction
 */
export const requestCorrection = async (data) => {
  const response = await api.post('/gps-attendance/corrections', data);
  return response.data;
};

/**
 * Get my correction requests
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status: 'pending', 'approved', 'rejected', 'withdrawn', 'all'
 */
export const getMyCorrections = async (params = {}) => {
  const response = await api.get('/gps-attendance/my-corrections', { params });
  return response.data;
};

/**
 * Withdraw a pending correction request
 * @param {number} correctionId - Correction request ID
 */
export const withdrawCorrection = async (correctionId) => {
  const response = await api.delete(`/gps-attendance/corrections/${correctionId}`);
  return response.data;
};

// =====================================================
// ADMIN SELF-SERVICE ENDPOINTS
// =====================================================

/**
 * Admin: Assign self to a branch for GPS attendance
 * @param {Object} data - Assignment data
 * @param {number} data.branch_id - Branch ID to assign to
 * @param {boolean} data.is_primary_branch - Whether this is the primary branch
 * @param {string} data.notes - Optional notes
 */
export const assignMeToBranch = async (data) => {
  const response = await api.post('/gps-attendance/assign-me-to-branch', data);
  return response.data;
};

/**
 * Admin: Remove self from a branch assignment
 * @param {number} branchId - Branch ID to remove assignment from
 */
export const removeMyBranchAssignment = async (branchId) => {
  const response = await api.delete(`/gps-attendance/remove-my-branch/${branchId}`);
  return response.data;
};

/**
 * Admin: Get available branches for self-assignment
 */
export const getAvailableBranches = async () => {
  const response = await api.get('/gps-attendance/available-branches');
  return response.data;
};

// =====================================================
// BRANCH MANAGEMENT - ADMIN ENDPOINTS
// =====================================================

/**
 * Get all branches
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status: 'active', 'inactive', 'all'
 * @param {string} params.city - Filter by city
 * @param {string} params.search - Search term
 */
export const getBranches = async (params = {}) => {
  const response = await api.get('/branches', { params });
  return response.data;
};

/**
 * Get single branch details
 * @param {number} branchId - Branch ID
 */
export const getBranch = async (branchId) => {
  const response = await api.get(`/branches/${branchId}`);
  return response.data;
};

/**
 * Create a new branch
 * @param {Object} data - Branch data
 */
export const createBranch = async (data) => {
  const response = await api.post('/branches', data);
  return response.data;
};

/**
 * Update a branch
 * @param {number} branchId - Branch ID
 * @param {Object} data - Branch data
 */
export const updateBranch = async (branchId, data) => {
  const response = await api.put(`/branches/${branchId}`, data);
  return response.data;
};

/**
 * Delete a branch
 * @param {number} branchId - Branch ID
 */
export const deleteBranch = async (branchId) => {
  const response = await api.delete(`/branches/${branchId}`);
  return response.data;
};

/**
 * Activate a branch
 * @param {number} branchId - Branch ID
 */
export const activateBranch = async (branchId) => {
  const response = await api.post(`/branches/${branchId}/activate`);
  return response.data;
};

/**
 * Deactivate a branch
 * @param {number} branchId - Branch ID
 */
export const deactivateBranch = async (branchId) => {
  const response = await api.post(`/branches/${branchId}/deactivate`);
  return response.data;
};

/**
 * Get employees assigned to a branch
 * @param {number} branchId - Branch ID
 * @param {Object} params - Query parameters
 */
export const getBranchEmployees = async (branchId, params = {}) => {
  const response = await api.get(`/branches/${branchId}/employees`, { params });
  return response.data;
};

/**
 * Assign an employee to a branch
 * @param {number} branchId - Branch ID
 * @param {Object} data - Assignment data
 */
export const assignEmployeeToBranch = async (branchId, data) => {
  const response = await api.post(`/branches/${branchId}/employees`, data);
  return response.data;
};

/**
 * Remove an employee from a branch
 * @param {number} branchId - Branch ID
 * @param {number} userId - User ID
 */
export const removeEmployeeFromBranch = async (branchId, userId) => {
  const response = await api.delete(`/branches/${branchId}/employees/${userId}`);
  return response.data;
};

/**
 * Get branch statistics
 * @param {number} branchId - Branch ID
 * @param {Object} params - Query parameters
 */
export const getBranchStatistics = async (branchId, params = {}) => {
  const response = await api.get(`/branches/${branchId}/statistics`, { params });
  return response.data;
};

// =====================================================
// ATTENDANCE REPORTS - FINANCE/ADMIN ENDPOINTS
// =====================================================

/**
 * Get daily attendance report
 * @param {Object} params - Query parameters
 * @param {string} params.date - Date (YYYY-MM-DD)
 * @param {number} params.branch_id - Filter by branch
 */
export const getDailyReport = async (params = {}) => {
  const response = await api.get('/attendance-reports/daily', { params });
  return response.data;
};

/**
 * Get monthly attendance report
 * @param {Object} params - Query parameters
 * @param {number} params.month - Month (1-12)
 * @param {number} params.year - Year
 * @param {number} params.branch_id - Filter by branch
 */
export const getMonthlyReport = async (params = {}) => {
  const response = await api.get('/attendance-reports/monthly', { params });
  return response.data;
};

/**
 * Get employee attendance report
 * @param {number} userId - User ID
 * @param {Object} params - Query parameters
 */
export const getEmployeeReport = async (userId, params = {}) => {
  const response = await api.get(`/attendance-reports/employee/${userId}`, { params });
  return response.data;
};

/**
 * Export attendance report as CSV
 * @param {Object} params - Export parameters
 * @param {string} params.type - Report type: 'daily', 'monthly', 'employee'
 */
export const exportReport = async (params) => {
  const response = await api.get('/attendance-reports/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Export attendance report as Excel (XLSX)
 * @param {Object} params - Export parameters
 * @param {string} params.type - Report type: 'daily', 'monthly', 'employee'
 */
export const exportReportExcel = async (params) => {
  const response = await api.get('/attendance-reports/export-excel', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Export attendance report as PDF
 * @param {Object} params - Export parameters
 * @param {string} params.type - Report type: 'daily', 'monthly', 'employee'
 */
export const exportReportPdf = async (params) => {
  const response = await api.get('/attendance-reports/export-pdf', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Download exported report
 * @param {Blob} blob - Report blob
 * @param {string} filename - Download filename
 */
export const downloadReport = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
/**
 * Get GPS validation failure statistics
 * @param {Object} params - Query parameters
 */
export const getGpsValidationStats = async (params = {}) => {
  const response = await api.get('/attendance-reports/gps-validation-stats', { params });
  return response.data;
};

/**
 * Get audit report
 * @param {Object} params - Query parameters
 */
export const getAuditReport = async (params = {}) => {
  const response = await api.get('/attendance-reports/audit', { params });
  return response.data;
};

// =====================================================
// LIVE ATTENDANCE - ADMIN ENDPOINTS
// =====================================================

/**
 * Get live attendance status for all employees
 * @param {Object} params - Query parameters
 * @param {number} params.branch_id - Filter by branch
 */
export const getLiveAttendance = async (params = {}) => {
  const response = await api.get('/attendance-admin/live', { params });
  return response.data;
};

/**
 * Get attendance corrections for review
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status: 'pending', 'approved', 'rejected', 'all'
 */
export const getAttendanceCorrections = async (params = {}) => {
  const response = await api.get('/attendance-admin/corrections', { params });
  return response.data;
};

/**
 * Update branch time settings
 * @param {number} branchId - Branch ID
 * @param {Object} settings - Time settings
 */
export const updateTimeSettings = async (branchId, settings) => {
  const response = await api.put(`/branches/${branchId}/time-settings`, settings);
  return response.data;
};

/**
 * Get audit logs for attendance
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Limit results
 */
export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/attendance-admin/audit-logs', { params });
  return response.data;
};

// =====================================================
// ATTENDANCE CORRECTIONS - ADMIN ENDPOINTS
// =====================================================

/**
 * Get all correction requests
 * @param {Object} params - Query parameters
 */
export const getCorrections = async (params = {}) => {
  const response = await api.get('/attendance-corrections', { params });
  return response.data;
};

/**
 * Get correction request details
 * @param {number} correctionId - Correction ID
 */
export const getCorrection = async (correctionId) => {
  const response = await api.get(`/attendance-corrections/${correctionId}`);
  return response.data;
};

/**
 * Approve a correction request
 * @param {number} correctionId - Correction ID
 * @param {Object} data - Approval data
 */
export const approveCorrection = async (correctionId, data = {}) => {
  const response = await api.post(`/attendance-corrections/${correctionId}/approve`, data);
  return response.data;
};

/**
 * Reject a correction request
 * @param {number} correctionId - Correction ID
 * @param {Object} data - Rejection data (must include review_notes)
 */
export const rejectCorrection = async (correctionId, data) => {
  const response = await api.post(`/attendance-corrections/${correctionId}/reject`, data);
  return response.data;
};

/**
 * Bulk approve/reject corrections
 * @param {Object} data - Bulk action data
 */
export const bulkCorrectionAction = async (data) => {
  const response = await api.post('/attendance-corrections/bulk-action', data);
  return response.data;
};

/**
 * Get correction statistics
 * @param {Object} params - Query parameters
 */
export const getCorrectionStatistics = async (params = {}) => {
  const response = await api.get('/attendance-corrections/statistics', { params });
  return response.data;
};

// =====================================================
// GEOLOCATION UTILITIES
// =====================================================

/**
 * Get current position using browser's Geolocation API
 * @param {Object} options - Geolocation options
 * @returns {Promise<GeolocationPosition>}
 */
export const getCurrentPosition = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      { ...defaultOptions, ...options }
    );
  });
};

/**
 * Check if geolocation is available
 * @returns {boolean}
 */
export const isGeolocationAvailable = () => {
  return 'geolocation' in navigator;
};

/**
 * Get device information for attendance tracking
 * @returns {Object}
 */
export const getDeviceInfo = () => {
  const { userAgent, platform, language } = navigator;
  
  return {
    user_agent: userAgent,
    platform,
    language,
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    connection: navigator.connection?.effectiveType || 'unknown',
  };
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - First latitude
 * @param {number} lon1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lon2 - Second longitude
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
};

export default {
  // Employee endpoints
  checkAccess,
  checkIn,
  checkOut,
  getTodayStatus,
  validateLocation,
  getMyHistory,
  getMyStatistics,
  requestCorrection,
  getMyCorrections,
  withdrawCorrection,
  
  // Admin self-service
  assignMeToBranch,
  removeMyBranchAssignment,
  getAvailableBranches,
  
  // Branch management
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  activateBranch,
  deactivateBranch,
  getBranchEmployees,
  assignEmployeeToBranch,
  removeEmployeeFromBranch,
  getBranchStatistics,
  
  // Reports
  getDailyReport,
  getMonthlyReport,
  getEmployeeReport,
  exportReport,
  exportReportExcel,
  exportReportPdf,
  downloadReport,
  getGpsValidationStats,
  getAuditReport,
  
  // Live attendance & admin
  getLiveAttendance,
  getAttendanceCorrections,
  updateTimeSettings,
  getAuditLogs,
  
  // Corrections
  getCorrections,
  getCorrection,
  approveCorrection,
  rejectCorrection,
  bulkCorrectionAction,
  getCorrectionStatistics,
  
  // Utilities
  getCurrentPosition,
  isGeolocationAvailable,
  getDeviceInfo,
  calculateDistance,
  formatDistance,
};
