import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, UserPlus, X, Users as UsersIcon, UserCheck, UserX, RefreshCw, Eye, ClipboardList, CheckCircle, Clock, AlertCircle, Calendar, MapPin } from 'lucide-react';
import { userAPI, departmentAPI, taskAPI } from '../services/api';
import { getBranches, assignEmployeeToBranch, removeEmployeeFromBranch } from '../services/gpsAttendanceService';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function Users() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    deptAdmins: 0,
    inactive: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    department_id: '',
    role: 'employee',
    status: 'active',
    managed_department_ids: [],
    emp_code: '',
    branch_id: ''
  });
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetchData();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await getBranches();
      setBranches(response.branches || response.data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // Set department filter for HODs when departments are loaded
  useEffect(() => {
    if (user?.role === 'hod' && departments.length > 0 && departmentFilter === 'all') {
      const managedIds = (user.managed_department_ids || [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0);
      
      const managedDepts = departments.filter(d => 
        managedIds.length > 0 
          ? managedIds.includes(Number(d.id))
          : Number(d.id) === Number(user.department_id)
      );
      
      // If only one department, set it as the filter; otherwise default to 'all' (managed only)
      if (managedDepts.length === 1) {
        setDepartmentFilter(String(managedDepts[0].id));
      }
    }
  }, [user, departments, departmentFilter]);

  // Generate secure password
  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setFormData({ ...formData, password });
  };

  // Check if current user can view employee details
  const canViewEmployee = (targetUser) => {
    // Admin can view all
    if (user?.role === 'admin') {
      return true;
    }
    
    // HR department users can view all
    const userDeptName = user?.department_name?.toLowerCase() || user?.department?.toLowerCase() || '';
    if (userDeptName === 'hr' || user?.department_id == 12) {
      return true;
    }
    
    // HOD can view employees in their managed departments
    if (user?.role === 'hod') {
      const managedDepts = (user.managed_department_ids || []).map(id => Number(id));
      const targetDeptId = Number(targetUser?.department_id);
      
      // If HOD has no managed depts, use their own department
      if (managedDepts.length === 0 && user.department_id) {
        return targetDeptId === Number(user.department_id);
      }
      
      return managedDepts.includes(targetDeptId);
    }
    
    return false;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes] = await Promise.all([
        userAPI.getAllUsers({ per_page: 1000 }), // Get all users for accurate counts
        departmentAPI.getAllDepartments()
      ]);
      const allUsers = (usersRes.data.data || []).filter(u => u.status !== 'pending');
      setUsers(allUsers);
      setDepartments(deptsRes.data || []);
      
      setStats({
        total: allUsers.length,
        active: allUsers.filter(u => u.status === 'active').length,
        deptAdmins: allUsers.filter(u => u.role === 'hod').length,
        inactive: allUsers.filter(u => u.status === 'inactive').length
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (userData) => {
    setSelectedUser(userData);
    // Get user's current branch assignment if any
    const userBranch = userData.branches?.find(b => b.pivot?.status === 'active') || userData.branches?.[0];
    setFormData({
      name: userData.name || '',
      username: userData.username,
      email: userData.email,
      password: '',
      phone: userData.phone || '',
      department_id: userData.department_id || '',
      role: userData.role,
      status: userData.status,
      managed_department_ids: userData.managed_department_ids || [],
      emp_code: userData.emp_code || '',
      branch_id: userBranch?.id?.toString() || ''
    });
    setShowEditModal(true);
  };

  const handleViewTasks = async (userData) => {
    setSelectedUser(userData);
    setTasksLoading(true);
    setShowTasksModal(true);
    setUserTasks([]);
    
    try {
      const response = await taskAPI.getAllTasks({ assigned_to: userData.id, per_page: 100 });
      setUserTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching user tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'on-hold': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTaskPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'urgent': return 'bg-purple-100 text-purple-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const handleOpenCreateModal = () => {
    // Reset form data and generate initial password
    const initialPassword = generateSecurePassword();
    setFormData({
      name: '',
      username: '',
      email: '',
      password: initialPassword,
      phone: '',
      department_id: '',
      role: 'employee',
      status: 'active',
      managed_department_ids: []
    });
    setShowCreateModal(true);
  };

  // Helper function for initial password generation
  const generateSecurePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Transform data to match backend expectations
      const department = departments.find(d => d.id === parseInt(formData.department_id));
      const createData = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        department: department?.name || '',
        department_id: formData.department_id,
        role: formData.role,
        phone: formData.phone,
        managed_department_ids: formData.managed_department_ids || []
      };
      
      console.log('Creating user with data:', createData);
      await userAPI.create(createData);
      setShowCreateModal(false);
      setFormData({
        username: '',
        email: '',
        password: '',
        phone: '',
        department_id: '',
        role: 'employee',
        status: 'active',
        managed_department_ids: []
      });
      fetchData();
    } catch (error) {
      console.error('Error creating user:', error);
      console.error('Validation errors:', error.response?.data?.errors);
      const errorMsg = error.response?.data?.errors 
        ? Object.values(error.response.data.errors).flat().join('\n')
        : error.response?.data?.message || 'Failed to create user';
      toast.error(errorMsg);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // Transform data to match backend expectations
      const department = departments.find(d => d.id === parseInt(formData.department_id));
      const updateData = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        department: department?.name || '',
        department_id: formData.department_id,
        role: formData.role,
        phone: formData.phone,
        status: formData.status,
        managed_department_ids: formData.managed_department_ids || [],
        emp_code: formData.emp_code || null
      };
      
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      await userAPI.update(selectedUser.id, updateData);

      // Handle branch assignment for Sales department
      const isSalesDept = department?.name?.toLowerCase() === 'sales';
      if (isSalesDept && formData.branch_id) {
        try {
          // First, remove any existing branch assignments
          const currentBranch = selectedUser.branches?.find(b => b.pivot?.status === 'active');
          if (currentBranch && currentBranch.id !== parseInt(formData.branch_id)) {
            await removeEmployeeFromBranch(currentBranch.id, selectedUser.id);
          }
          // Then assign to new branch
          if (!currentBranch || currentBranch.id !== parseInt(formData.branch_id)) {
            await assignEmployeeToBranch(formData.branch_id, {
              user_id: selectedUser.id,
              is_primary_branch: true
            });
          }
        } catch (branchError) {
          console.error('Error updating branch assignment:', branchError);
          // Don't fail the entire update if branch assignment fails
          toast.warning('User updated but showroom assignment may have failed');
        }
      }

      setShowEditModal(false);
      setSelectedUser(null);
      toast.success('Employee updated successfully');
      fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
      console.error('Validation errors:', error.response?.data?.errors);
      const errorMsg = error.response?.data?.errors 
        ? Object.values(error.response.data.errors).flat().join('\n')
        : error.response?.data?.message || 'Failed to update user';
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (userId) => {
    const confirmed = await confirmDialog.show({
      type: 'danger',
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    try {
      await userAPI.delete(userId);
      toast.success('User deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete user';
      toast.error(errorMessage);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    
    // Handle department filter for HODs with managed departments
    let matchesDept = true;
    if (departmentFilter === 'all') {
      // For HODs, 'all' means all managed departments, not all departments
      if (user.role === 'hod') {
        const managedIds = (user.managed_department_ids || [])
          .map(id => Number(id))
          .filter(id => Number.isFinite(id) && id > 0);
        if (managedIds.length > 0) {
          matchesDept = managedIds.includes(Number(u.department_id));
        } else {
          matchesDept = Number(u.department_id) === Number(user.department_id);
        }
      }
      // For admin, 'all' means all departments - no filtering needed
    } else {
      matchesDept = String(u.department_id) === String(departmentFilter);
    }
    
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'hod': return 'bg-blue-100 text-blue-800';
      case 'senior_employee': return 'bg-purple-100 text-purple-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black">Employee Management</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage employees and permissions</p>
      </div>

      {/* Statistics - Horizontal scroll on mobile */}
      <div className="mb-4 sm:mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex sm:grid sm:grid-cols-4 gap-3 sm:gap-6 overflow-x-auto pb-2 sm:pb-0 snap-x snap-mandatory scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex-shrink-0 w-[140px] sm:w-auto bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 snap-start">
            <div className="flex items-center justify-between mb-2">
              <UsersIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm font-medium">Total Employees</h3>
            <p className="text-2xl sm:text-3xl font-bold text-black mt-1">{stats.total}</p>
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 snap-start">
            <div className="flex items-center justify-between mb-2">
              <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm font-medium">Active Employees</h3>
            <p className="text-2xl sm:text-3xl font-bold text-black mt-1">{stats.active}</p>
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 snap-start">
            <div className="flex items-center justify-between mb-2">
              <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm font-medium">HODs</h3>
            <p className="text-2xl sm:text-3xl font-bold text-black mt-1">{stats.deptAdmins}</p>
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 snap-start">
            <div className="flex items-center justify-between mb-2">
              <UserX className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" />
            </div>
            <h3 className="text-gray-600 text-xs sm:text-sm font-medium">Inactive Employees</h3>
            <p className="text-2xl sm:text-3xl font-bold text-black mt-1">{stats.inactive}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="text-xs sm:text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} employees
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700">Filters</h3>
          {(roleFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setRoleFilter('all');
                setDepartmentFilter('all');
                setStatusFilter('all');
                setSearchTerm('');
              }}
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 active:scale-95 transition-transform"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Clear Filters</span>
              <span className="xs:hidden">Clear</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {/* Search */}
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-2 sm:px-4 py-2 text-xs sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white"
          >
            <option value="all">All Roles</option>
            {user.role === 'admin' && <option value="admin">Admin</option>}
            <option value="hod">HOD</option>
            <option value="senior_employee">Senior Employee</option>
            <option value="employee">Employee</option>
          </select>

          {/* Department Filter */}
          {(() => {
            const managedIds = (user.managed_department_ids || [])
              .map(id => Number(id))
              .filter(id => Number.isFinite(id) && id > 0);
            const isMultiDeptHOD = user.role === 'hod' && managedIds.length > 1;
            const isSingleDeptHOD = user.role === 'hod' && managedIds.length <= 1;
            
            // Check if user is from HR department (ID 12)
            // Use the same logic as DashboardLayout for consistency
            const isHR = (user?.department_name?.toLowerCase() === 'hr') || 
                         (user?.department?.toLowerCase() === 'hr') ||
                         (user?.department_id == 12) ||  // HR department ID
                         (user?.departmentRelation?.name?.toLowerCase() === 'hr');
            
            // Determine if user can see all departments
            const canSeeAllDepts = user.role === 'admin' || isHR;
            
            return (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                disabled={isSingleDeptHOD && !canSeeAllDepts}
                className="w-full px-2 sm:px-4 py-2 text-xs sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white"
              >
                {/* Show 'All' option for admins, HR users, or multi-dept HODs */}
                {(canSeeAllDepts || isMultiDeptHOD) && (
                  <option value="all">
                    {isMultiDeptHOD && !canSeeAllDepts ? 'All My Departments' : 'All Departments'}
                  </option>
                )}
                {departments
                  .filter(dept => {
                    // Admins and HR users can see all departments
                    if (canSeeAllDepts) return true;
                    // HODs can only see their managed departments
                    if (user.role === 'hod') {
                      if (managedIds.length > 0) {
                        return managedIds.includes(Number(dept.id));
                      }
                      return Number(dept.id) === Number(user.department_id);
                    }
                    return false;
                  })
                  .map(dept => (
                    <option key={dept.id} value={String(dept.id)}>{dept.name}</option>
                  ))
                }
              </select>
            );
          })()}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2 sm:px-4 py-2 text-xs sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <div key={u.id} className="bg-white rounded-xl sm:rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow active:bg-gray-50">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold text-base sm:text-lg">
                      {u.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${getStatusColor(u.status)}`}>
                    {u.status}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-semibold text-black mb-0.5 sm:mb-1 truncate">{u.username}</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1 truncate">{u.email}</p>
                {u.phone && (
                  <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{u.phone}</p>
                )}

                <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium text-black truncate max-w-[120px] sm:max-w-none">{u.department_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-gray-600">Role:</span>
                    <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-full ${getRoleBadgeColor(u.role)}`}>
                      {u.role === 'admin' ? 'Admin' : u.role === 'hod' ? 'HOD' : u.role === 'senior_employee' ? 'Senior' : 'Employee'}
                    </span>
                  </div>
                  {/* Show Showroom if user has branches */}
                  {u.branches && u.branches.length > 0 && (
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Showroom:
                      </span>
                      <span className="font-medium text-blue-600 truncate max-w-[120px] sm:max-w-none">
                        {u.branches.find(b => b.pivot?.is_primary_branch)?.name || u.branches[0]?.name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-1.5 sm:gap-2 pt-3 sm:pt-4 border-t border-gray-200">
                  {canViewEmployee(u) && (
                    <button
                      onClick={() => navigate(`/dashboard/employees/${u.id}`)}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors active:scale-95"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">View</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(u)}
                    className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Delete</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 sm:py-12">
              <p className="text-sm sm:text-base text-gray-500">No employees found</p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Create Employee Account</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter employee's full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username for login"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="employee@company.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                  >
                    <option value="employee">Employee</option>
                    <option value="senior_employee">Senior Employee</option>
                    <option value="hod">Head of Department (HOD)</option>
                    {user.role === 'admin' && <option value="admin">Admin</option>}
                  </select>
                </div>
              </div>

              {/* Generated Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generated Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-red-600 transition-colors"
                    title="Generate new password"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  A secure password has been generated. Click refresh to generate a new one.
                </p>
              </div>

              {/* Managed Departments - Only for Department Admins */}
              {formData.role === 'hod' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Managed Departments <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                    {departments.map(dept => (
                      <label key={dept.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.managed_department_ids || []).includes(dept.id)}
                          onChange={(e) => {
                            const currentIds = formData.managed_department_ids || [];
                            const newIds = e.target.checked
                              ? [...currentIds, dept.id]
                              : currentIds.filter(id => id !== dept.id);
                            setFormData({ ...formData, managed_department_ids: newIds });
                          }}
                          className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Select all departments this admin can manage
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      name: '',
                      username: '',
                      email: '',
                      password: generateSecurePassword(),
                      phone: '',
                      department_id: '',
                      role: 'employee',
                      status: 'active',
                      managed_department_ids: []
                    });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Create Employee Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Edit Employee</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee Code</label>
                <input
                  type="text"
                  value={formData.emp_code}
                  onChange={(e) => {
                    // Only allow numeric values
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setFormData({ ...formData, emp_code: value });
                  }}
                  placeholder="e.g., 124"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="employee">Employee</option>
                  <option value="senior_employee">Senior Employee</option>
                  <option value="hod">Head of Department (HOD)</option>
                  {user.role === 'admin' && <option value="admin">Admin</option>}
                </select>
              </div>

              {/* Managed Departments - Only for Department Admins */}
              {formData.role === 'hod' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Managed Departments *
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                    {departments.map(dept => (
                      <label key={dept.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.managed_department_ids || []).includes(dept.id)}
                          onChange={(e) => {
                            const currentIds = formData.managed_department_ids || [];
                            const newIds = e.target.checked
                              ? [...currentIds, dept.id]
                              : currentIds.filter(id => id !== dept.id);
                            setFormData({ ...formData, managed_department_ids: newIds });
                          }}
                          className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{dept.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Select all departments this admin can manage
                  </p>
                </div>
              )}

              {/* Showroom Assignment - Only for Sales department */}
              {departments.find(d => d.id === parseInt(formData.department_id))?.name?.toLowerCase() === 'sales' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Assigned Showroom
                  </label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Select Showroom</option>
                    {branches.filter(b => b.is_active).map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Assign the showroom location for this Sales staff member
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Update Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Tasks Modal */}
      {showTasksModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {selectedUser.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedUser.username}'s Tasks</h2>
                    <p className="text-sm text-gray-600">{selectedUser.email} • {selectedUser.department_name || 'No Department'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTasksModal(false)} 
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-white rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-200 bg-gray-50">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{userTasks.length}</div>
                <div className="text-xs text-gray-600">Total Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {userTasks.filter(t => t.status === 'completed').length}
                </div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {userTasks.filter(t => t.status === 'in-progress').length}
                </div>
                <div className="text-xs text-gray-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {userTasks.filter(t => new Date(t.due_date) < new Date() && t.status !== 'completed').length}
                </div>
                <div className="text-xs text-gray-600">Overdue</div>
              </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4">
              {tasksLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : userTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <ClipboardList className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No tasks assigned</p>
                  <p className="text-sm">This user has no tasks assigned yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userTasks.map(task => (
                    <div 
                      key={task.id}
                      onClick={() => {
                        setShowTasksModal(false);
                        navigate(`/dashboard/tasks/${task.id}`);
                      }}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 truncate">{task.title}</h4>
                            {task.subtasks_count > 0 && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                {task.completed_subtasks_count}/{task.subtasks_count} subtasks
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTaskStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTaskPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            {task.due_date && (
                              <span className={`flex items-center gap-1 text-xs ${
                                new Date(task.due_date) < new Date() && task.status !== 'completed'
                                  ? 'text-red-600 font-medium'
                                  : 'text-gray-500'
                              }`}>
                                <Calendar className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {task.department && (
                              <span className="text-xs text-gray-500">
                                {task.department}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {/* Progress */}
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-700">{task.progress || 0}%</div>
                            <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className={`h-2 rounded-full ${
                                  task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${task.progress || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <button
                onClick={() => setShowTasksModal(false)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
