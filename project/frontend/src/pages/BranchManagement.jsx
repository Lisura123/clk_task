import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import {
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
} from '../services/gpsAttendanceService';
import api from '../services/api';
import {
  BuildingOffice2Icon,
  MapPinIcon,
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  EyeIcon,
  UserPlusIcon,
  UserMinusIcon,
  AdjustmentsHorizontalIcon,
  BuildingLibraryIcon,
  ClockIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const BranchManagement = () => {
  const { user } = useAuthStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('showrooms'); // showrooms, departments
  
  // Branch list state
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Department state
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false);
  const [selectedDepartmentToAdd, setSelectedDepartmentToAdd] = useState('');
  const [departmentSettings, setDepartmentSettings] = useState({
    work_start_time: '09:00',
    work_end_time: '18:00',
    late_grace_minutes: 15,
    location_name: '',
    address: '',
    city: '',
    latitude: '',
    longitude: '',
    allowed_radius_meters: 100,
    gps_required: true,
  });
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [showDepartmentSettingsModal, setShowDepartmentSettingsModal] = useState(false);
  const [gettingDeptLocation, setGettingDeptLocation] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Branch employees
  const [branchEmployees, setBranchEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  
  // Statistics
  const [statistics, setStatistics] = useState(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  
  // Available users for assignment
  const [availableUsers, setAvailableUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Form state
  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    branch_type: 'outlet',
    address: '',
    city: '',
    district: '',
    province: '',
    latitude: '',
    longitude: '',
    allowed_radius_meters: 100,
    contact_number: '',
    operating_hours_start: '08:00',
    operating_hours_end: '18:00',
    branch_manager_id: '',
  });
  
  // Assignment form
  const [assignmentForm, setAssignmentForm] = useState({
    user_id: '',
    is_primary_branch: true,
    effective_from: new Date().toISOString().split('T')[0],
    notes: '',
  });
  
  // Action loading
  const [actionLoading, setActionLoading] = useState(false);

  // Load branches
  useEffect(() => {
    loadBranches();
    loadAllDepartments();
    loadAttendanceDepartments();
  }, [statusFilter]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const data = await getBranches({
        status: statusFilter,
        search: searchTerm,
      });
      setBranches(data.branches || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  // Load all departments for dropdown
  const loadAllDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setAllDepartments(response.data.departments || response.data || []);
    } catch (err) {
      console.error('Failed to load all departments:', err);
    }
  };

  // Load departments configured for attendance
  const loadAttendanceDepartments = async () => {
    try {
      const response = await api.get('/attendance-admin/departments');
      setDepartments(response.data.departments || []);
    } catch (err) {
      console.error('Failed to load attendance departments:', err);
    }
  };

  // Add department to attendance tracking
  const handleAddDepartment = async () => {
    if (!selectedDepartmentToAdd) {
      alert('Please select a department');
      return;
    }
    try {
      setActionLoading(true);
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
        location_name: '',
        address: '',
        city: '',
        latitude: '',
        longitude: '',
        allowed_radius_meters: 100,
        gps_required: true,
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add department');
    } finally {
      setActionLoading(false);
    }
  };

  // Remove department from attendance tracking
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

  // Update department attendance settings
  const handleUpdateDepartmentSettings = async () => {
    if (!editingDepartment) return;
    try {
      setActionLoading(true);
      await api.put(`/attendance-admin/departments/${editingDepartment.id}`, departmentSettings);
      loadAttendanceDepartments();
      setShowDepartmentSettingsModal(false);
      setEditingDepartment(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update department settings');
    } finally {
      setActionLoading(false);
    }
  };

  // Load branch employees
  const loadBranchEmployees = async (branchId) => {
    try {
      setEmployeesLoading(true);
      const data = await getBranchEmployees(branchId);
      // API returns { employees: [...] }
      const employees = Array.isArray(data) ? data : (data.employees || []);
      setBranchEmployees(employees);
    } catch (err) {
      console.error('Failed to load employees:', err);
      setBranchEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Load available users
  const loadAvailableUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await api.get('/users/basic');
      // API returns { users: [...] }
      const users = Array.isArray(response.data) ? response.data : (response.data.users || []);
      setAvailableUsers(users);
    } catch (err) {
      console.error('Failed to load users:', err);
      setAvailableUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Load branch statistics
  const loadBranchStatistics = async (branchId) => {
    try {
      setStatisticsLoading(true);
      const data = await getBranchStatistics(branchId);
      setStatistics(data);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    } finally {
      setStatisticsLoading(false);
    }
  };

  // Open branch modal for editing
  const handleEditBranch = async (branch) => {
    setSelectedBranch(branch);
    setIsEditing(true);
    setBranchForm({
      name: branch.name || '',
      code: branch.code || '',
      branch_type: branch.branch_type || 'outlet',
      address: branch.address || '',
      city: branch.city || '',
      district: branch.district || '',
      province: branch.province || '',
      latitude: branch.latitude || '',
      longitude: branch.longitude || '',
      allowed_radius_meters: branch.allowed_radius_meters || 100,
      contact_number: branch.contact_number || '',
      operating_hours_start: branch.operating_hours_start || '08:00',
      operating_hours_end: branch.operating_hours_end || '18:00',
      branch_manager_id: branch.branch_manager_id || '',
    });
    setShowBranchModal(true);
  };

  // Open branch modal for creating
  const handleCreateBranch = () => {
    setSelectedBranch(null);
    setIsEditing(false);
    setBranchForm({
      name: '',
      code: '',
      branch_type: 'outlet',
      address: '',
      city: '',
      district: '',
      province: '',
      latitude: '',
      longitude: '',
      allowed_radius_meters: 100,
      contact_number: '',
      operating_hours_start: '08:00',
      operating_hours_end: '18:00',
      branch_manager_id: '',
    });
    setShowBranchModal(true);
  };

  // Submit branch form
  const handleSubmitBranch = async (e) => {
    e.preventDefault();
    
    try {
      setActionLoading(true);
      
      const formData = {
        ...branchForm,
        latitude: parseFloat(branchForm.latitude),
        longitude: parseFloat(branchForm.longitude),
        allowed_radius_meters: parseInt(branchForm.allowed_radius_meters),
      };
      
      if (isEditing && selectedBranch) {
        await updateBranch(selectedBranch.id, formData);
      } else {
        await createBranch(formData);
      }
      
      setShowBranchModal(false);
      loadBranches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save branch');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle branch status
  const handleToggleBranchStatus = async (branch) => {
    if (!window.confirm(`Are you sure you want to ${branch.is_active ? 'deactivate' : 'activate'} ${branch.name}?`)) {
      return;
    }
    
    try {
      if (branch.is_active) {
        await deactivateBranch(branch.id);
      } else {
        await activateBranch(branch.id);
      }
      loadBranches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update branch status');
    }
  };

  // Delete branch
  const handleDeleteBranch = async (branch) => {
    if (!window.confirm(`Are you sure you want to delete ${branch.name}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteBranch(branch.id);
      loadBranches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete branch');
    }
  };

  // Open employees modal
  const handleManageEmployees = (branch) => {
    setSelectedBranch(branch);
    loadBranchEmployees(branch.id);
    loadAvailableUsers();
    setShowEmployeeModal(true);
  };

  // Open statistics modal
  const handleViewStatistics = (branch) => {
    setSelectedBranch(branch);
    loadBranchStatistics(branch.id);
    setShowStatisticsModal(true);
  };

  // Assign employee
  const handleAssignEmployee = async (e) => {
    e.preventDefault();
    
    if (!selectedBranch || !assignmentForm.user_id) return;
    
    try {
      setActionLoading(true);
      await assignEmployeeToBranch(selectedBranch.id, assignmentForm);
      
      setAssignmentForm({
        user_id: '',
        is_primary_branch: true,
        effective_from: new Date().toISOString().split('T')[0],
        notes: '',
      });
      
      loadBranchEmployees(selectedBranch.id);
      loadBranches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign employee');
    } finally {
      setActionLoading(false);
    }
  };

  // Remove employee
  const handleRemoveEmployee = async (userId) => {
    if (!selectedBranch) return;
    
    if (!window.confirm('Are you sure you want to remove this employee from the branch?')) {
      return;
    }
    
    try {
      await removeEmployeeFromBranch(selectedBranch.id, userId);
      loadBranchEmployees(selectedBranch.id);
      loadBranches();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove employee');
    }
  };

  // Check if user has admin access
  if (user?.role !== 'admin' && user?.role !== 'hod') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to access showroom management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Showroom Management</h1>
            <p className="text-gray-600 mt-1">Manage CameraLK showrooms, departments and employee assignments</p>
          </div>
          {activeTab === 'showrooms' ? (
            <button
              onClick={handleCreateBranch}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Showroom
            </button>
          ) : (
            <button
              onClick={() => setShowAddDepartmentModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Department
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('showrooms')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'showrooms'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BuildingOffice2Icon className="h-5 w-5 mr-2" />
              Showrooms ({branches.length})
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'departments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BuildingLibraryIcon className="h-5 w-5 mr-2" />
              Departments ({departments.length})
            </button>
          </nav>
        </div>

        {/* Showrooms Tab Content */}
        {activeTab === 'showrooms' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search showrooms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && loadBranches()}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-lg px-4 py-2"
                >
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="all">All Showrooms</option>
                </select>
                <button
                  onClick={loadBranches}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          /* Branch Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden ${
                  !branch.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {branch.name}
                      </h3>
                      <p className="text-sm text-gray-500">{branch.code}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      branch.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center text-gray-600">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      <span className="truncate">{branch.address}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      <span>{branch.employee_count || 0} employees</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <BuildingOffice2Icon className="h-4 w-4 mr-2" />
                      <span className="capitalize">{branch.branch_type}</span>
                    </div>
                  </div>

                  {/* Today's Stats */}
                  {branch.today_stats && (
                    <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg mb-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">
                          {branch.today_stats.checked_in}
                        </p>
                        <p className="text-xs text-gray-500">Checked In</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-yellow-600">
                          {branch.today_stats.late}
                        </p>
                        <p className="text-xs text-gray-500">Late</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">
                          {branch.today_stats.attendance_rate}%
                        </p>
                        <p className="text-xs text-gray-500">Rate</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleViewStatistics(branch)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                    >
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      Stats
                    </button>
                    <button
                      onClick={() => handleManageEmployees(branch)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
                    >
                      <UserGroupIcon className="h-4 w-4 mr-1" />
                      Staff
                    </button>
                    <button
                      onClick={() => handleEditBranch(branch)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleBranchStatus(branch)}
                      className={`p-2 rounded-lg ${
                        branch.is_active
                          ? 'text-yellow-600 hover:bg-yellow-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {branch.is_active ? (
                        <XCircleIcon className="h-4 w-4" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteBranch(branch)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      disabled={branch.employee_count > 0}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {branches.length === 0 && !loading && (
              <div className="col-span-full text-center py-12">
                <BuildingOffice2Icon className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="mt-4 text-gray-500">No branches found</p>
              </div>
            )}
          </div>
        )}
        </>
      )}

      {/* Departments Tab Content */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-medium text-gray-900">Department Attendance Settings</h3>
            <p className="text-sm text-gray-500 mt-1">Configure attendance tracking settings for departments</p>
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
                          <UserGroupIcon className="h-4 w-4 mr-1" />
                          {dept.employee_count || 0} employees
                        </span>
                        <span className="text-xs text-gray-400">
                          Grace: {dept.late_grace_minutes || 15} mins
                        </span>
                        {dept.location_name && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <MapPinIcon className="h-3 w-3" />
                            {dept.location_name}
                          </span>
                        )}
                        {!dept.location_name && dept.gps_required !== false && (
                          <span className="text-xs text-orange-500">⚠️ No location set</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingDepartment(dept);
                        setDepartmentSettings({
                          work_start_time: dept.work_start_time || '09:00',
                          work_end_time: dept.work_end_time || '18:00',
                          late_grace_minutes: dept.late_grace_minutes || 15,
                          location_name: dept.location_name || '',
                          address: dept.address || '',
                          city: dept.city || '',
                          latitude: dept.latitude || '',
                          longitude: dept.longitude || '',
                          allowed_radius_meters: dept.allowed_radius_meters || 100,
                          gps_required: dept.gps_required !== false,
                        });
                        setShowDepartmentSettingsModal(true);
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
      )}
      </div>

      {/* Branch Form Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                {isEditing ? 'Edit Showroom' : 'Create New Showroom'}
              </h2>
            </div>

            <form onSubmit={handleSubmitBranch} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Showroom Name *
                  </label>
                  <input
                    type="text"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Showroom Code *
                  </label>
                  <input
                    type="text"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                    maxLength={20}
                    placeholder="e.g., CLK-MC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Showroom Type *
                  </label>
                  <select
                    value={branchForm.branch_type}
                    onChange={(e) => setBranchForm({ ...branchForm, branch_type: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="headquarters">Headquarters</option>
                    <option value="regional">Regional</option>
                    <option value="outlet">Outlet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={branchForm.contact_number}
                    onChange={(e) => setBranchForm({ ...branchForm, contact_number: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    District
                  </label>
                  <input
                    type="text"
                    value={branchForm.district}
                    onChange={(e) => setBranchForm({ ...branchForm, district: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Province
                  </label>
                  <input
                    type="text"
                    value={branchForm.province}
                    onChange={(e) => setBranchForm({ ...branchForm, province: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={branchForm.latitude}
                    onChange={(e) => setBranchForm({ ...branchForm, latitude: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                    placeholder="e.g., 6.8928"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={branchForm.longitude}
                    onChange={(e) => setBranchForm({ ...branchForm, longitude: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                    placeholder="e.g., 79.8563"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GPS Radius (meters) *
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={branchForm.allowed_radius_meters}
                    onChange={(e) => setBranchForm({ ...branchForm, allowed_radius_meters: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operating Hours Start
                  </label>
                  <input
                    type="time"
                    value={branchForm.operating_hours_start}
                    onChange={(e) => setBranchForm({ ...branchForm, operating_hours_start: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operating Hours End
                  </label>
                  <input
                    type="time"
                    value={branchForm.operating_hours_end}
                    onChange={(e) => setBranchForm({ ...branchForm, operating_hours_end: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {actionLoading ? 'Saving...' : isEditing ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Management Modal */}
      {showEmployeeModal && selectedBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                Manage Employees - {selectedBranch.name}
              </h2>
            </div>

            <div className="p-6">
              {/* Assign Employee Form */}
              <form onSubmit={handleAssignEmployee} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-3">Assign Employee</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Employee
                    </label>
                    <select
                      value={assignmentForm.user_id}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, user_id: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Select an employee...</option>
                      {Array.isArray(availableUsers) && availableUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.username})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Effective From
                    </label>
                    <input
                      type="date"
                      value={assignmentForm.effective_from}
                      onChange={(e) => setAssignmentForm({ ...assignmentForm, effective_from: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={assignmentForm.is_primary_branch}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, is_primary_branch: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="is_primary" className="text-sm text-gray-700">
                    Set as primary branch
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={actionLoading || !assignmentForm.user_id}
                  className="mt-3 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
                >
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Assign Employee
                </button>
              </form>

              {/* Employee List */}
              <h3 className="font-medium mb-3">Assigned Employees ({branchEmployees.length})</h3>
              {employeesLoading ? (
                <div className="flex justify-center py-8">
                  <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : branchEmployees.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No employees assigned to this branch</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {branchEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          {employee.profile_picture ? (
                            <img src={employee.profile_picture} alt="" className="w-10 h-10 rounded-full" />
                          ) : (
                            <span className="text-gray-500 font-medium">
                              {employee.name?.charAt(0) || '?'}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <p className="text-sm text-gray-500">
                            {employee.username}
                            {employee.assignment_info?.is_primary_branch && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                Primary
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {employee.today_status && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            employee.today_status.checked_in
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {employee.today_status.checked_in ? `In: ${employee.today_status.check_in_time}` : 'Not checked in'}
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveEmployee(employee.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <UserMinusIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {showStatisticsModal && selectedBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                Statistics - {selectedBranch.name}
              </h2>
            </div>

            <div className="p-6">
              {statisticsLoading ? (
                <div className="flex justify-center py-8">
                  <ArrowPathIcon className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : statistics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-700">
                        {statistics.statistics?.total_employees || 0}
                      </p>
                      <p className="text-sm text-blue-600">Employees</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-700">
                        {statistics.statistics?.attendance_rate || 0}%
                      </p>
                      <p className="text-sm text-green-600">Attendance Rate</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-yellow-700">
                        {statistics.statistics?.punctuality_rate || 0}%
                      </p>
                      <p className="text-sm text-yellow-600">Punctuality</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-700">
                        {statistics.statistics?.average_working_hours || 0}h
                      </p>
                      <p className="text-sm text-purple-600">Avg Hours</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Period: {statistics.period?.from} to {statistics.period?.to}
                  </p>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No statistics available</p>
              )}
            </div>

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowStatisticsModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddDepartmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Add Department to Attendance Tracking</h2>
            </div>

            <div className="p-6 space-y-4">
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

            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddDepartmentModal(false);
                  setSelectedDepartmentToAdd('');
                  setDepartmentSettings({
                    work_start_time: '09:00',
                    work_end_time: '18:00',
                    late_grace_minutes: 15,
                    location_name: '',
                    address: '',
                    city: '',
                    latitude: '',
                    longitude: '',
                    allowed_radius_meters: 100,
                    gps_required: true,
                  });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDepartment}
                disabled={actionLoading || !selectedDepartmentToAdd}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400"
              >
                {actionLoading ? 'Adding...' : 'Add Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Settings Modal */}
      {showDepartmentSettingsModal && editingDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">
                Configure {editingDepartment.department?.name || editingDepartment.name}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Time Settings Section */}
              <div className="pb-4 border-b">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Work Hours</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Start Time</label>
                    <input
                      type="time"
                      value={departmentSettings.work_start_time || ''}
                      onChange={(e) => setDepartmentSettings({ ...departmentSettings, work_start_time: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work End Time</label>
                    <input
                      type="time"
                      value={departmentSettings.work_end_time || ''}
                      onChange={(e) => setDepartmentSettings({ ...departmentSettings, work_end_time: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Late Grace Period (minutes)</label>
                  <input
                    type="number"
                    value={departmentSettings.late_grace_minutes || ''}
                    onChange={(e) => setDepartmentSettings({ ...departmentSettings, late_grace_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* GPS Location Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">📍 GPS Location Settings</h3>
                
                <div className="mb-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={departmentSettings.gps_required ?? true}
                      onChange={(e) => setDepartmentSettings({ ...departmentSettings, gps_required: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Require GPS check-in at location</span>
                  </label>
                </div>

                {departmentSettings.gps_required && (
                  <>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                      <input
                        type="text"
                        value={departmentSettings.location_name || ''}
                        onChange={(e) => setDepartmentSettings({ ...departmentSettings, location_name: e.target.value })}
                        placeholder="e.g., Head Office, Finance Building"
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={departmentSettings.address || ''}
                        onChange={(e) => setDepartmentSettings({ ...departmentSettings, address: e.target.value })}
                        placeholder="Full address"
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={departmentSettings.city || ''}
                        onChange={(e) => setDepartmentSettings({ ...departmentSettings, city: e.target.value })}
                        placeholder="City"
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                        <input
                          type="text"
                          value={departmentSettings.latitude || ''}
                          onChange={(e) => setDepartmentSettings({ ...departmentSettings, latitude: e.target.value })}
                          placeholder="e.g., 6.9271"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                        <input
                          type="text"
                          value={departmentSettings.longitude || ''}
                          onChange={(e) => setDepartmentSettings({ ...departmentSettings, longitude: e.target.value })}
                          placeholder="e.g., 79.8612"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        setGettingDeptLocation(true);
                        try {
                          const position = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                              enableHighAccuracy: true,
                              timeout: 10000,
                            });
                          });
                          setDepartmentSettings({
                            ...departmentSettings,
                            latitude: position.coords.latitude.toFixed(8),
                            longitude: position.coords.longitude.toFixed(8),
                          });
                        } catch (err) {
                          alert('Failed to get location. Please enter manually.');
                        }
                        setGettingDeptLocation(false);
                      }}
                      disabled={gettingDeptLocation}
                      className="w-full mb-3 px-3 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2"
                    >
                      {gettingDeptLocation ? (
                        <span>Getting Location...</span>
                      ) : (
                        <>
                          <MapPinIcon className="h-4 w-4" />
                          <span>Use Current Location</span>
                        </>
                      )}
                    </button>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Radius (meters)</label>
                      <input
                        type="number"
                        value={departmentSettings.allowed_radius_meters || 100}
                        onChange={(e) => setDepartmentSettings({ ...departmentSettings, allowed_radius_meters: parseInt(e.target.value) || 100 })}
                        min="10"
                        max="500"
                        className="w-full border rounded-lg px-3 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Employees must be within this distance to check in</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDepartmentSettingsModal(false);
                  setEditingDepartment(null);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDepartmentSettings}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {actionLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;
