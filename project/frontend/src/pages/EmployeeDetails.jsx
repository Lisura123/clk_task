import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, Phone, Building2, Calendar, 
  CheckCircle, Clock, AlertCircle, TrendingUp, Briefcase,
  Shield, Activity, Edit2, FileText, Target, Award, CalendarDays,
  Plane, ThermometerSun, Heart, Briefcase as BriefcaseIcon, RefreshCw,
  ClipboardCheck, LogIn, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  
  const [employee, setEmployee] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [completionRate, setCompletionRate] = useState(0);
  const [recentTasks, setRecentTasks] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveStats, setLeaveStats] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchEmployeeDetails = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const response = await api.get(`/users/${id}`);
      const data = response.data;
      
      setEmployee(data.user);
      setTaskStats(data.task_stats);
      setCompletionRate(data.completion_rate);
      setRecentTasks(data.recent_tasks || []);
      setRecentActivity(data.recent_activity || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching employee details:', err);
      setError(err.response?.data?.message || 'Failed to load employee details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const fetchLeaveData = useCallback(async () => {
    try {
      // Fetch leave balances for this employee (admin/hod only endpoint)
      const balanceRes = await api.get(`/leave-balances/user/${id}`).catch(() => ({ data: { data: [] } }));
      const balanceData = balanceRes.data?.data || [];
      
      // Calculate leave stats from balances
      if (balanceData.length > 0) {
        const stats = {
          balances: balanceData,
          total_allocated: balanceData.reduce((sum, b) => sum + (b.allocated_days || 0), 0),
          total_used: balanceData.reduce((sum, b) => sum + (b.used_days || 0), 0),
          total_pending: balanceData.reduce((sum, b) => sum + (b.pending_days || 0), 0),
          total_available: balanceData.reduce((sum, b) => sum + (b.available_days || 0), 0),
        };
        setLeaveStats(stats);
      }
      
      // Fetch leave requests for this employee
      const leavesRes = await api.get(`/leaves/user/${id}`).catch(() => ({ data: { data: [] } }));
      const leaveData = leavesRes.data?.data || leavesRes.data || [];
      setLeaves(Array.isArray(leaveData) ? leaveData : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching leave data:', err);
    }
  }, [id]);

  // Fetch attendance data
  const fetchAttendance = useCallback(async (month = attendanceMonth, year = attendanceYear, autoNavigate = false) => {
    try {
      setAttendanceLoading(true);
      const response = await api.get(`/users/${id}/attendance`, {
        params: { month, year }
      });
      
      const data = response.data;
      setAttendance(data.attendance?.data || []);
      setAttendanceStats(data.statistics || null);
      
      // If no records found and we have latest_month info, auto-navigate to it
      if (autoNavigate && data.attendance?.data?.length === 0 && data.latest_month) {
        const { month: latestMonth, year: latestYear } = data.latest_month;
        if (latestMonth !== month || latestYear !== year) {
          setAttendanceMonth(latestMonth);
          setAttendanceYear(latestYear);
          // Will trigger another fetch with the new month/year
          return;
        }
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setAttendance([]);
      setAttendanceStats(null);
    } finally {
      setAttendanceLoading(false);
    }
  }, [id, attendanceMonth, attendanceYear]);

  // Change attendance month
  const changeAttendanceMonth = (direction) => {
    let newMonth = attendanceMonth + direction;
    let newYear = attendanceYear;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    
    setAttendanceMonth(newMonth);
    setAttendanceYear(newYear);
  };

  // Track if this is first attendance fetch (for auto-navigation)
  const [isFirstAttendanceFetch, setIsFirstAttendanceFetch] = useState(true);

  // Fetch attendance when month/year changes or when tab is activated
  useEffect(() => {
    if (activeTab === 'attendance') {
      // On first fetch, enable auto-navigate to latest month with data
      fetchAttendance(attendanceMonth, attendanceYear, isFirstAttendanceFetch);
      if (isFirstAttendanceFetch) {
        setIsFirstAttendanceFetch(false);
      }
    }
  }, [attendanceMonth, attendanceYear, activeTab, fetchAttendance, isFirstAttendanceFetch]);

  // Initial data fetch
  useEffect(() => {
    fetchEmployeeDetails();
    fetchLeaveData();
  }, [id, fetchEmployeeDetails, fetchLeaveData]);

  // Auto-refresh every 30 seconds when viewing the page
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEmployeeDetails(true);
      fetchLeaveData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchEmployeeDetails, fetchLeaveData]);

  // Manual refresh function
  const handleRefresh = () => {
    fetchEmployeeDetails(true);
    fetchLeaveData();
  };

  const getRoleBadge = (role) => {
    const roles = {
      admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800' },
      hod: { label: 'HOD', color: 'bg-blue-100 text-blue-800' },
      senior_employee: { label: 'Senior Employee', color: 'bg-green-100 text-green-800' },
      employee: { label: 'Employee', color: 'bg-gray-100 text-gray-800' },
    };
    const roleInfo = roles[role] || { label: role, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleInfo.color}`}>
        {roleInfo.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statuses = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      inactive: { label: 'Inactive', color: 'bg-red-100 text-red-800' },
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    };
    const statusInfo = statuses[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getTaskStatusColor = (status) => {
    const colors = {
      'completed': 'bg-green-100 text-green-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'todo': 'bg-gray-100 text-gray-800',
      'on-hold': 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'urgent': 'bg-red-100 text-red-800',
      'high': 'bg-orange-100 text-orange-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if current user is from HR department
  const isHR = (currentUser?.department_name?.toLowerCase() === 'hr') || 
               (currentUser?.department?.toLowerCase() === 'hr') ||
               (currentUser?.department_id == 12) ||
               (currentUser?.departmentRelation?.name?.toLowerCase() === 'hr');

  const canEdit = currentUser?.role === 'admin' || 
    isHR ||
    (currentUser?.role === 'hod' && employee?.department_id && 
     currentUser?.managed_department_ids?.includes(employee.department_id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Employee</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Employee Not Found</h2>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              {employee.profile_picture ? (
                <img
                  src={employee.profile_picture}
                  alt={employee.name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-gray-100"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-3xl md:text-4xl font-bold">
                  {employee.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            
            {/* Basic Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{employee.name}</h1>
                <div className="flex items-center gap-2">
                  {getRoleBadge(employee.role)}
                  {getStatusBadge(employee.status)}
                </div>
              </div>
              
              <p className="text-gray-600 text-lg mb-4">@{employee.username}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="truncate">{employee.email}</span>
                </div>
                
                {employee.phone && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-gray-600">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <span>{employee.department_name || 'No Department'}</span>
                </div>
                
                {employee.emp_code && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                    <span>Emp Code: <span className="font-medium">{employee.emp_code}</span></span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span>Joined {formatDate(employee.created_at)}</span>
                </div>
              </div>
              
              {/* Managed Departments for HODs */}
              {employee.managed_departments && employee.managed_departments.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Manages:</p>
                  <div className="flex flex-wrap gap-2">
                    {employee.managed_departments.map(dept => (
                      <span key={dept.id} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        {dept.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              
              {/* Edit Button */}
              {canEdit && (
                <button
                  onClick={() => navigate(`/dashboard/employees/edit/${employee.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
              
              {/* Last Updated */}
              {lastUpdated && (
                <p className="text-xs text-gray-400 text-center mt-1">
                  Updated {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{taskStats?.total_assigned || 0}</p>
              <p className="text-xs text-gray-500">Total Tasks</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{taskStats?.completed || 0}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{taskStats?.in_progress || 0}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{taskStats?.todo || 0}</p>
              <p className="text-xs text-gray-500">To Do</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{taskStats?.overdue || 0}</p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
              <p className="text-xs text-gray-500">Completion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6 overflow-x-auto">
            {['overview', 'tasks', 'activity', 'attendance', 'leaves', 'settings'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Chart Placeholder */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-600" />
                  Performance Overview
                </h3>
                
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Task Completion Rate</span>
                    <span className="font-semibold">{completionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${completionRate}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-500">Tasks Created</p>
                    <p className="text-xl font-bold text-gray-900">{taskStats?.total_created || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-500">On Hold</p>
                    <p className="text-xl font-bold text-gray-900">{taskStats?.on_hold || 0}</p>
                  </div>
                </div>
              </div>
              
              {/* Personal Info */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-600" />
                  Account Information
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">User ID</span>
                    <span className="font-medium text-gray-900">#{employee.id}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Username</span>
                    <span className="font-medium text-gray-900">@{employee.username}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Role</span>
                    {getRoleBadge(employee.role)}
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Status</span>
                    {getStatusBadge(employee.status)}
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200">
                    <span className="text-gray-600">Department</span>
                    <span className="font-medium text-gray-900">{employee.department_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="font-medium text-gray-900">{formatDate(employee.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Tasks</h3>
              
              {recentTasks.length > 0 ? (
                <div className="space-y-3">
                  {recentTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                        <p className="text-sm text-gray-500">{task.department}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className="text-sm text-gray-500 hidden sm:block">
                          Due: {formatDate(task.due_date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No tasks assigned yet</p>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
              
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900">
                          <span className="font-medium">{activity.action}</span>
                          {activity.task && (
                            <span 
                              className="text-blue-600 hover:underline cursor-pointer ml-1"
                              onClick={() => navigate(`/dashboard/tasks/${activity.task.id}`)}
                            >
                              {activity.task.title}
                            </span>
                          )}
                        </p>
                        {activity.details && (
                          <p className="text-sm text-gray-500 mt-1">{activity.details}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(activity.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-gray-600" />
                  Attendance Records
                </h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => changeAttendanceMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="font-medium text-gray-700 min-w-[140px] text-center">
                    {new Date(attendanceYear, attendanceMonth - 1).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                  <button
                    onClick={() => changeAttendanceMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    disabled={attendanceYear === new Date().getFullYear() && attendanceMonth === new Date().getMonth() + 1}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Statistics Cards */}
              {attendanceStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <CalendarDays className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-800">{attendanceStats.total_days || 0}</p>
                        <p className="text-sm text-blue-600">Total Days Recorded</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <LogIn className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-800">{attendanceStats.days_with_in_time || 0}</p>
                        <p className="text-sm text-green-600">Days with Check-in</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <LogOut className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-800">{attendanceStats.days_with_out_time || 0}</p>
                        <p className="text-sm text-orange-600">Days with Check-out</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Attendance Table */}
              {attendanceLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : attendance.length > 0 ? (
                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Day</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Check In</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Check Out</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Working Hours</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {attendance.map((record, index) => {
                          const date = new Date(record.date);
                          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                          
                          return (
                            <tr 
                              key={record.id || index} 
                              className={`hover:bg-gray-50 ${isWeekend ? 'bg-gray-50' : ''}`}
                            >
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {formatDate(record.date)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <span className={isWeekend ? 'text-red-500 font-medium' : ''}>
                                  {dayName}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {record.in_time ? (
                                  <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-md">
                                    <LogIn className="w-3 h-3" />
                                    {record.in_time}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {record.out_time ? (
                                  <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded-md">
                                    <LogOut className="w-3 h-3" />
                                    {record.out_time}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {record.working_hours ? (
                                  <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                                    <Clock className="w-3 h-3" />
                                    {record.working_hours}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {record.dept_name || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No attendance records found</p>
                  <p className="text-sm mt-1">
                    {employee?.emp_code 
                      ? `No records for Employee Code: ${employee.emp_code}` 
                      : 'This employee has no Employee Code assigned yet'
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Leaves Tab */}
          {activeTab === 'leaves' && (
            <div className="space-y-6">
              {/* Leave Balance Cards */}
              {leaveStats?.balances && leaveStats.balances.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    Leave Balances ({new Date().getFullYear()})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {leaveStats.balances.map((balance) => {
                      const leaveType = balance.leave_type?.name || 'Unknown';
                      const icon = leaveType.toLowerCase().includes('annual') || leaveType.toLowerCase().includes('vacation') ? Plane
                        : leaveType.toLowerCase().includes('sick') ? ThermometerSun
                        : leaveType.toLowerCase().includes('casual') ? Heart
                        : BriefcaseIcon;
                      const IconComponent = icon;
                      
                      return (
                        <div key={balance.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <IconComponent className="w-5 h-5 text-blue-600" />
                            </div>
                            <h4 className="font-medium text-gray-800">{leaveType}</h4>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Allocated</span>
                              <span className="font-medium">{balance.allocated_days || 0} days</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Used</span>
                              <span className="font-medium text-red-600">{balance.used_days || 0} days</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Pending</span>
                              <span className="font-medium text-yellow-600">{balance.pending_days || 0} days</span>
                            </div>
                            <div className="h-px bg-gray-200 my-2" />
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 font-medium">Available</span>
                              <span className="font-semibold text-green-600">{balance.available_days || 0} days</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all" 
                                style={{ 
                                  width: `${Math.min(100, ((balance.used_days || 0) / (balance.allocated_days || 1)) * 100)}%` 
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-400 mt-1 text-right">
                              {Math.round(((balance.used_days || 0) / (balance.allocated_days || 1)) * 100)}% used
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Leave Summary Stats */}
              {leaveStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-sm text-blue-600 font-medium">Total Allocated</p>
                    <p className="text-2xl font-bold text-blue-800 mt-1">{leaveStats.total_allocated || 0}</p>
                    <p className="text-xs text-blue-500">days this year</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <p className="text-sm text-red-600 font-medium">Total Used</p>
                    <p className="text-2xl font-bold text-red-800 mt-1">{leaveStats.total_used || 0}</p>
                    <p className="text-xs text-red-500">days consumed</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                    <p className="text-sm text-yellow-600 font-medium">Pending</p>
                    <p className="text-2xl font-bold text-yellow-800 mt-1">{leaveStats.total_pending || 0}</p>
                    <p className="text-xs text-yellow-500">days awaiting</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <p className="text-sm text-green-600 font-medium">Available</p>
                    <p className="text-2xl font-bold text-green-800 mt-1">{leaveStats.total_available || 0}</p>
                    <p className="text-xs text-green-500">days remaining</p>
                  </div>
                </div>
              )}

              {/* Leave History */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Leave History
                </h3>
                
                {leaves.length > 0 ? (
                  <div className="space-y-4">
                    {leaves.map((leave) => {
                      const getStatusColor = (status) => {
                        switch(status) {
                          case 'approved': return 'bg-green-100 text-green-800';
                          case 'hod_approved': return 'bg-blue-100 text-blue-800';
                          case 'pending': return 'bg-yellow-100 text-yellow-800';
                          case 'rejected': return 'bg-red-100 text-red-800';
                          case 'cancelled': return 'bg-gray-100 text-gray-800';
                          default: return 'bg-gray-100 text-gray-800';
                        }
                      };
                      
                      const getStatusLabel = (status) => {
                        switch(status) {
                          case 'approved': return 'Approved';
                          case 'hod_approved': return 'Pending Admin';
                          case 'pending': return 'Pending';
                          case 'rejected': return 'Rejected';
                          case 'cancelled': return 'Cancelled';
                          default: return status?.charAt(0).toUpperCase() + status?.slice(1) || '-';
                        }
                      };
                      
                      return (
                        <div key={leave.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: leave.leave_type?.color || '#3B82F6' }}
                              ></span>
                              <span className="font-semibold text-gray-800">
                                {leave.leave_type?.name || leave.leaveType?.name || 'Unknown'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                                {getStatusLabel(leave.status)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Applied: {formatDate(leave.created_at)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-sm">
                            <div>
                              <span className="text-gray-500">From:</span>
                              <span className="ml-1 font-medium">{formatDate(leave.start_date)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">To:</span>
                              <span className="ml-1 font-medium">{formatDate(leave.end_date)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Days:</span>
                              <span className="ml-1 font-medium">{leave.total_days || leave.days || '-'}</span>
                            </div>
                          </div>
                          
                          {/* Reason */}
                          {leave.reason && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-gray-500 uppercase">Reason:</span>
                              <p className="text-sm text-gray-700 mt-1">{leave.reason}</p>
                            </div>
                          )}
                          
                          {/* Days Note */}
                          {leave.days_note && (
                            <div className="bg-blue-50 rounded-lg p-2 mt-2">
                              <span className="text-xs font-medium text-blue-600 uppercase">Days Specification:</span>
                              <p className="text-sm text-blue-700 mt-1">{leave.days_note}</p>
                            </div>
                          )}
                          
                          {/* Rejection Reason */}
                          {leave.rejection_reason && (
                            <div className="bg-red-50 rounded-lg p-2 mt-2">
                              <span className="text-xs font-medium text-red-600 uppercase">Rejection Reason:</span>
                              <p className="text-sm text-red-700 mt-1">{leave.rejection_reason}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No leave requests found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Notification Preferences</h3>
              
              <div className="space-y-4 max-w-md">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive email updates</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    employee.email_notifications ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {employee.email_notifications ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Task Reminders</p>
                    <p className="text-sm text-gray-500">Get reminded about upcoming tasks</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    employee.task_reminders ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {employee.task_reminders ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Comment Notifications</p>
                    <p className="text-sm text-gray-500">Get notified about new comments</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    employee.comment_notifications ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {employee.comment_notifications ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
