import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, UserPlus, X, Users as UsersIcon, UserCheck, UserX, RefreshCw } from 'lucide-react';
import { userAPI, departmentAPI } from '../services/api';
import useAuthStore from '../store/authStore';

export default function Users() {
  const { user } = useAuthStore();
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    department_id: '',
    role: 'employee',
    status: 'active',
    managed_department_ids: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Set department filter for HODs when departments are loaded
  useEffect(() => {
    if (user?.role === 'dept_admin' && departments.length > 0 && departmentFilter === 'all') {
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
        setDepartmentFilter(managedDepts[0].id);
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
        deptAdmins: allUsers.filter(u => u.role === 'dept_admin').length,
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
    setFormData({
      name: userData.name || '',
      username: userData.username,
      email: userData.email,
      password: '',
      phone: userData.phone || '',
      department_id: userData.department_id || '',
      role: userData.role,
      status: userData.status,
      managed_department_ids: userData.managed_department_ids || []
    });
    setShowEditModal(true);
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
      alert(errorMsg);
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
        managed_department_ids: formData.managed_department_ids || []
      };
      
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      await userAPI.update(selectedUser.id, updateData);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
      console.error('Validation errors:', error.response?.data?.errors);
      const errorMsg = error.response?.data?.errors 
        ? Object.values(error.response.data.errors).flat().join('\n')
        : error.response?.data?.message || 'Failed to update user';
      alert(errorMsg);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await userAPI.delete(userId);
      fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete user';
      alert(errorMessage);
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
      if (user.role === 'dept_admin') {
        const managedIds = (user.managed_department_ids || [])
          .map(id => Number(id))
          .filter(id => Number.isFinite(id) && id > 0);
        if (managedIds.length > 0) {
          matchesDept = managedIds.includes(Number(u.department_id));
        } else {
          matchesDept = Number(u.department_id) === Number(user.department_id);
        }
      }
      // For super_admin, 'all' means all departments - no filtering needed
    } else {
      matchesDept = u.department_id == departmentFilter;
    }
    
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'dept_admin': return 'bg-blue-100 text-blue-800';
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black">Employee Management</h1>
        <p className="text-gray-600 mt-1">Manage employees and permissions</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <UsersIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Total Employees</h3>
          <p className="text-3xl font-bold text-black mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Active Employees</h3>
          <p className="text-3xl font-bold text-black mt-1">{stats.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <UserPlus className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-gray-600 text-sm font-medium">HODs</h3>
          <p className="text-3xl font-bold text-black mt-1">{stats.deptAdmins}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <UserX className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Inactive Employees</h3>
          <p className="text-3xl font-bold text-black mt-1">{stats.inactive}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} employees
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          {(roleFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setRoleFilter('all');
                setDepartmentFilter('all');
                setStatusFilter('all');
                setSearchTerm('');
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Roles</option>
            {user.role === 'super_admin' && <option value="super_admin">Admin</option>}
            <option value="dept_admin">HOD</option>
            <option value="employee">Employee</option>
          </select>

          {/* Department Filter */}
          {(() => {
            const managedIds = (user.managed_department_ids || [])
              .map(id => Number(id))
              .filter(id => Number.isFinite(id) && id > 0);
            const isMultiDeptHOD = user.role === 'dept_admin' && managedIds.length > 1;
            const isSingleDeptHOD = user.role === 'dept_admin' && !isMultiDeptHOD;
            
            return (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                disabled={isSingleDeptHOD}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {/* Show 'All' option for admins or multi-dept HODs */}
                {(user.role === 'super_admin' || isMultiDeptHOD) && (
                  <option value="all">
                    {isMultiDeptHOD ? 'All My Departments' : 'All Departments'}
                  </option>
                )}
                {departments
                  .filter(dept => {
                    if (user.role === 'super_admin') return true;
                    if (user.role === 'dept_admin') {
                      if (managedIds.length > 0) {
                        return managedIds.includes(Number(dept.id));
                      }
                      return Number(dept.id) === Number(user.department_id);
                    }
                    return false;
                  })
                  .map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))
                }
              </select>
            );
          })()}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <div key={u.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 font-semibold text-lg">
                      {u.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(u.status)}`}>
                    {u.status}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-black mb-1">{u.username}</h3>
                <p className="text-sm text-gray-600 mb-1">{u.email}</p>
                {u.phone && (
                  <p className="text-sm text-gray-600 mb-3">{u.phone}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium text-black">{u.department_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Role:</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(u.role)}`}>
                      {u.role === 'super_admin' ? 'Admin' : u.role === 'dept_admin' ? 'HOD' : 'Employee'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(u)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No employees found</p>
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
                    <option value="dept_admin">Head of Department (HOD)</option>
                    {user.role === 'super_admin' && <option value="super_admin">Admin</option>}
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
              {formData.role === 'dept_admin' && (
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
                  <option value="dept_admin">Head of Department (HOD)</option>
                  {user.role === 'super_admin' && <option value="super_admin">Admin</option>}
                </select>
              </div>

              {/* Managed Departments - Only for Department Admins */}
              {formData.role === 'dept_admin' && (
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
    </div>
  );
}
