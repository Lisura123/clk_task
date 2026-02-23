import React, { useState, useEffect, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import {
  getBranches,
  getBranchEmployees,
  getLiveAttendance,
  getAttendanceCorrections,
  approveCorrection,
  rejectCorrection,
  updateTimeSettings,
  getAuditLogs,
} from '../services/gpsAttendanceService';
import api from '../services/api';
import {
  BuildingOffice2Icon,
  UsersIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  EyeIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

const AttendanceAdmin = () => {
  const { user } = useAuthStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('live'); // live, corrections, settings, audit
  
  // Data state
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [liveAttendance, setLiveAttendance] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [timeSettings, setTimeSettings] = useState({});
  
  // Department state
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
  const [selectedDepartmentToAdd, setSelectedDepartmentToAdd] = useState('');
  const [departmentSettings, setDepartmentSettings] = useState({
    work_start_time: '09:00',
    work_end_time: '18:00',
    late_grace_minutes: 15,
  });
  
  // Loading/error state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal state
  const [settingsModal, setSettingsModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [correctionModal, setCorrectionModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Auto-refresh interval for live attendance
  useEffect(() => {
    let interval;
    if (activeTab === 'live') {
      loadLiveAttendance();
      interval = setInterval(loadLiveAttendance, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, selectedBranch]);

  useEffect(() => {
    loadBranches();
    loadAllDepartments();
    loadAttendanceDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'corrections') loadCorrections();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab]);

  const loadBranches = async () => {
    try {
      const data = await getBranches({ status: 'active' });
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadAllDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setAllDepartments(response.data.departments || response.data || []);
    } catch (err) {
      console.error('Failed to load all departments:', err);
    }
  };

  const loadAttendanceDepartments = async () => {
    try {
      const response = await api.get('/attendance-admin/departments');
      setDepartments(response.data.departments || []);
    } catch (err) {
      console.error('Failed to load attendance departments:', err);
    }
  };

  const handleAddDepartment = async () => {
    if (!selectedDepartmentToAdd) {
      alert('Please select a department');
      return;
    }
    try {
      await api.post('/attendance-admin/departments', {
        department_id: selectedDepartmentToAdd,
        ...departmentSettings,
      });
      loadAttendanceDepartments();
      setShowAddDepartmentModal(false);
      setSelectedDepartmentToAdd('');
      setDepartmentSettings({
        work_start_time: '09:00',
        work_end_time: '18:00',
        late_grace_minutes: 15,
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add department');
    }
  };

  const handleRemoveDepartment = async (departmentId) => {
    if (!window.confirm('Are you sure you want to remove this department from attendance tracking?')) {
      return;
    }
    try {
      await api.delete(`/attendance-admin/departments/${departmentId}`);
      loadAttendanceDepartments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove department');
    }
  };

  const handleUpdateDepartmentSettings = async (departmentId, settings) => {
    try {
      await api.put(`/attendance-admin/departments/${departmentId}`, settings);
      loadAttendanceDepartments();
      setSettingsModal(false);
      setEditingBranch(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update department settings');
    }
  };

  const loadLiveAttendance = async () => {
    try {
      setRefreshing(true);
      const data = await getLiveAttendance({
        branch_id: selectedBranch || undefined,
      });
      setLiveAttendance(data.attendance || []);
    } catch (err) {
      console.error('Failed to load live attendance:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadCorrections = async () => {
    try {
      setLoading(true);
      const data = await getAttendanceCorrections({ status: 'pending' });
      setCorrections(data.corrections || []);
    } catch (err) {
      console.error('Failed to load corrections:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await getAuditLogs({ limit: 50 });
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCorrection = async (correctionId) => {
    try {
      await approveCorrection(correctionId);
      loadCorrections();
      setCorrectionModal(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve correction');
    }
  };

  const handleRejectCorrection = async (correctionId) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    try {
      await rejectCorrection(correctionId, rejectReason);
      loadCorrections();
      setCorrectionModal(null);
      setRejectReason('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject correction');
    }
  };

  const handleUpdateTimeSettings = async (branchId, settings) => {
    try {
      await updateTimeSettings(branchId, settings);
      loadBranches();
      setSettingsModal(false);
      setEditingBranch(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update settings');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'checked_in':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full flex items-center"><CheckCircleIcon className="h-3 w-3 mr-1" />Checked In</span>;
      case 'checked_out':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full flex items-center"><CheckCircleIcon className="h-3 w-3 mr-1" />Checked Out</span>;
      case 'late':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full flex items-center"><ClockIcon className="h-3 w-3 mr-1" />Late</span>;
      case 'absent':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full flex items-center"><XCircleIcon className="h-3 w-3 mr-1" />Absent</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">{status || 'Unknown'}</span>;
    }
  };

  // Tab content components
  const LiveAttendanceTab = () => (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Showrooms</option>
            {Array.isArray(branches) && branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={loadLiveAttendance}
          disabled={refreshing}
          className="flex items-center px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
        >
          <ArrowPathIcon className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Showroom Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.isArray(branches) && branches.map((branch) => {
          const branchAttendance = liveAttendance.filter(a => a.branch_id === branch.id);
          const checkedIn = branchAttendance.filter(a => a.status === 'checked_in').length;
          const total = branchAttendance.length;
          
          return (
            <div key={branch.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <BuildingOffice2Icon className="h-6 w-6 text-blue-500 mr-2" />
                  <h3 className="font-medium text-gray-900">{branch.name}</h3>
                </div>
                <span className="text-xs text-gray-500">{branch.is_active ? '🟢' : '🔴'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Present Now</span>
                <span className="font-bold text-green-600">{checkedIn}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500">Total Expected</span>
                <span className="font-medium text-gray-900">{branch.employee_count || total}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Showroom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(liveAttendance) && liveAttendance.map((record, index) => (
                <tr key={record.id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                        {record.user?.name?.charAt(0) || '?'}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{record.user?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{record.user?.employee_id || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {record.branch?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.check_in_time || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.check_out_time || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(record.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {record.location_verified ? (
                      <span className="text-green-600 flex items-center text-sm">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        Verified
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center text-sm">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        Not Verified
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {(!liveAttendance || liveAttendance.length === 0) && (
          <div className="text-center py-12">
            <UsersIcon className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="mt-4 text-gray-500">No attendance records for today</p>
          </div>
        )}
      </div>
    </div>
  );

  const CorrectionsTab = () => (
    <div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Pending Correction Requests</h3>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
            {corrections.length} Pending
          </span>
        </div>
        
        <div className="divide-y">
          {Array.isArray(corrections) && corrections.map((correction) => (
            <div key={correction.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-medium">
                      {correction.user?.name?.charAt(0) || '?'}
                    </div>
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">{correction.user?.name}</div>
                      <div className="text-sm text-gray-500">{correction.date} • {correction.branch?.name}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Original Time:</span>
                      <span className="ml-2 font-medium">{correction.original_time || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Requested Time:</span>
                      <span className="ml-2 font-medium text-blue-600">{correction.requested_time}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-500 text-sm">Reason:</span>
                    <p className="mt-1 text-gray-700">{correction.reason}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleApproveCorrection(correction.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-sm"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Approve
                  </button>
                  <button
                    onClick={() => setCorrectionModal(correction)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center text-sm"
                  >
                    <XCircleIcon className="h-4 w-4 mr-1" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {(!corrections || corrections.length === 0) && (
          <div className="text-center py-12">
            <CheckCircleIcon className="h-12 w-12 text-green-300 mx-auto" />
            <p className="mt-4 text-gray-500">No pending correction requests</p>
          </div>
        )}
      </div>
    </div>
  );

  const SettingsTab = () => {
    // Get departments not already added
    const availableDepartments = allDepartments.filter(
      dept => !departments.find(d => d.department_id === dept.id)
    );

    return (
      <div className="space-y-6">
        {/* Showroom Settings */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-medium text-gray-900">Showroom Time Settings</h3>
            <p className="text-sm text-gray-500 mt-1">Configure check-in/out times and GPS radius for each showroom</p>
          </div>
          
          <div className="divide-y">
            {Array.isArray(branches) && branches.map((branch) => (
              <div key={branch.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BuildingOffice2Icon className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900">{branch.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {branch.work_start_time || '09:00'} - {branch.work_end_time || '18:00'}
                        </span>
                        <span className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-1" />
                          {branch.gps_radius || 100}m radius
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingBranch({ ...branch, type: 'branch' });
                      setTimeSettings({
                        work_start_time: branch.work_start_time || '09:00',
                        work_end_time: branch.work_end_time || '18:00',
                        late_grace_minutes: branch.late_grace_minutes || 15,
                        gps_radius: branch.gps_radius || 100,
                      });
                      setSettingsModal(true);
                    }}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center"
                  >
                    <Cog6ToothIcon className="h-5 w-5 mr-2" />
                    Configure
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Settings */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Department Time Settings</h3>
              <p className="text-sm text-gray-500 mt-1">Configure attendance settings for departments</p>
            </div>
            <button
              onClick={() => setShowAddDepartmentModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Department
            </button>
          </div>
          
          <div className="divide-y">
            {Array.isArray(departments) && departments.map((dept) => (
              <div key={dept.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BuildingLibraryIcon className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <h4 className="font-medium text-gray-900">{dept.department?.name || dept.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {dept.work_start_time || '09:00'} - {dept.work_end_time || '18:00'}
                        </span>
                        <span className="flex items-center">
                          <UsersIcon className="h-4 w-4 mr-1" />
                          {dept.employee_count || 0} employees
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingBranch({ ...dept, type: 'department' });
                        setTimeSettings({
                          work_start_time: dept.work_start_time || '09:00',
                          work_end_time: dept.work_end_time || '18:00',
                          late_grace_minutes: dept.late_grace_minutes || 15,
                        });
                        setSettingsModal(true);
                      }}
                      className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center"
                    >
                      <Cog6ToothIcon className="h-5 w-5 mr-2" />
                      Configure
                    </button>
                    <button
                      onClick={() => handleRemoveDepartment(dept.id)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(!departments || departments.length === 0) && (
            <div className="text-center py-12">
              <BuildingLibraryIcon className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="mt-4 text-gray-500">No departments added for attendance tracking</p>
              <p className="text-sm text-gray-400 mt-1">Click "Add Department" to add one</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const AuditLogTab = () => (
    <div>
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Attendance Audit Log</h3>
          <span className="text-sm text-gray-500">Last 50 entries</span>
        </div>
        
        <div className="divide-y max-h-[600px] overflow-y-auto">
          {Array.isArray(auditLogs) && auditLogs.map((log, index) => (
            <div key={log.id || index} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-start">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  log.action === 'check_in' ? 'bg-green-100' :
                  log.action === 'check_out' ? 'bg-blue-100' :
                  log.action === 'correction_approved' ? 'bg-purple-100' :
                  log.action === 'correction_rejected' ? 'bg-red-100' :
                  'bg-gray-100'
                }`}>
                  {log.action === 'check_in' && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
                  {log.action === 'check_out' && <CheckCircleIcon className="h-4 w-4 text-blue-600" />}
                  {log.action === 'correction_approved' && <ShieldCheckIcon className="h-4 w-4 text-purple-600" />}
                  {log.action === 'correction_rejected' && <XCircleIcon className="h-4 w-4 text-red-600" />}
                  {!['check_in', 'check_out', 'correction_approved', 'correction_rejected'].includes(log.action) && (
                    <DocumentTextIcon className="h-4 w-4 text-gray-600" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{log.user?.name || 'System'}</span>
                    <span className="text-xs text-gray-500">{log.created_at}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                  {log.metadata && (
                    <div className="mt-2 text-xs text-gray-400">
                      {log.metadata.ip_address && <span>IP: {log.metadata.ip_address}</span>}
                      {log.metadata.device && <span className="ml-4">Device: {log.metadata.device}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {(!auditLogs || auditLogs.length === 0) && (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto" />
            <p className="mt-4 text-gray-500">No audit logs available</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Administration</h1>
        <p className="text-gray-600 mt-1">Monitor, manage, and configure GPS attendance system</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('live')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'live'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <EyeIcon className="h-5 w-5 mr-2" />
            Live Attendance
            {refreshing && <ArrowPathIcon className="h-4 w-4 ml-2 animate-spin" />}
          </button>
          <button
            onClick={() => setActiveTab('corrections')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'corrections'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            Corrections
            {corrections.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {corrections.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Cog6ToothIcon className="h-5 w-5 mr-2" />
            Showroom Settings
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Audit Log
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'live' && <LiveAttendanceTab />}
      {activeTab === 'corrections' && <CorrectionsTab />}
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'audit' && <AuditLogTab />}

      {/* Rejection Modal */}
      {correctionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Correction Request</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting the correction request from{' '}
              <strong>{correctionModal.user?.name}</strong>.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full border rounded-lg px-3 py-2 h-32 focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setCorrectionModal(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectCorrection(correctionModal.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsModal && editingBranch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Configure {editingBranch.department?.name || editingBranch.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Start Time</label>
                <input
                  type="time"
                  value={timeSettings.work_start_time || ''}
                  onChange={(e) => setTimeSettings({ ...timeSettings, work_start_time: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work End Time</label>
                <input
                  type="time"
                  value={timeSettings.work_end_time || ''}
                  onChange={(e) => setTimeSettings({ ...timeSettings, work_end_time: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Late Grace Period (minutes)</label>
                <input
                  type="number"
                  value={timeSettings.late_grace_minutes || ''}
                  onChange={(e) => setTimeSettings({ ...timeSettings, late_grace_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              {editingBranch.type === 'branch' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GPS Radius (meters)</label>
                  <input
                    type="number"
                    value={timeSettings.gps_radius || ''}
                    onChange={(e) => setTimeSettings({ ...timeSettings, gps_radius: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setSettingsModal(false);
                  setEditingBranch(null);
                  setTimeSettings({});
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingBranch.type === 'department') {
                    handleUpdateDepartmentSettings(editingBranch.id, timeSettings);
                  } else {
                    handleUpdateTimeSettings(editingBranch.id, timeSettings);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddDepartmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Add Department to Attendance Tracking
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Department</label>
                <select
                  value={selectedDepartmentToAdd}
                  onChange={(e) => setSelectedDepartmentToAdd(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">-- Select Department --</option>
                  {allDepartments
                    .filter(dept => !departments.find(d => d.department_id === dept.id))
                    .map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))
                  }
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Start Time</label>
                <input
                  type="time"
                  value={departmentSettings.work_start_time}
                  onChange={(e) => setDepartmentSettings({ ...departmentSettings, work_start_time: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work End Time</label>
                <input
                  type="time"
                  value={departmentSettings.work_end_time}
                  onChange={(e) => setDepartmentSettings({ ...departmentSettings, work_end_time: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Late Grace Period (minutes)</label>
                <input
                  type="number"
                  value={departmentSettings.late_grace_minutes}
                  onChange={(e) => setDepartmentSettings({ ...departmentSettings, late_grace_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddDepartmentModal(false);
                  setSelectedDepartmentToAdd('');
                  setDepartmentSettings({
                    work_start_time: '09:00',
                    work_end_time: '18:00',
                    late_grace_minutes: 15,
                  });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDepartment}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add Department
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceAdmin;
