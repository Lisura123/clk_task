import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building2, Shield, Calendar, Edit2, Save, X, Lock, Eye, EyeOff, CheckCircle, Clock, AlertCircle, BarChart3, Users, Play, RotateCcw, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import useAuthStore from '../store/authStore';
import api, { authAPI, userAPI } from '../services/api';
import { useToast } from '../components/Toast';

const Profile = () => {
  const { user: currentUser, setUser, updateUser } = useAuthStore();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restartingTour, setRestartingTour] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueCount: 0,
    completionRate: 0
  });

  useEffect(() => {
    const hydrateMe = async () => {
      try {
        const res = await authAPI.me();
        if (res?.data?.user) {
          setUser(res.data.user);
        }
      } catch (error) {
        // Non-fatal: fall back to whatever is in local storage.
        console.error('Error fetching profile:', error);
      }
    };

    if (currentUser) {
      setFormData({
        name: currentUser.name || currentUser.full_name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || ''
      });
      fetchUserStats();
    } else {
      hydrateMe();
    }
  }, [currentUser]);

  const fetchUserStats = async () => {
    try {
      // For Super Admin, fetch system-wide stats
      if (currentUser.role === 'admin') {
        const [tasksRes, usersRes, deptsRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/users'),
          api.get('/departments')
        ]);

        const tasks = tasksRes.data.tasks || [];
        const users = usersRes.data.data || [];
        const departments = deptsRes.data.departments || deptsRes.data.data || [];

        const completed = tasks.filter(t => t.status === 'completed').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        const todo = tasks.filter(t => t.status === 'todo').length;
        const overdue = tasks.filter(t => {
          if (t.status === 'completed') return false;
          if (!t.due_date) return false;
          return new Date(t.due_date) < new Date();
        }).length;
        const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

        setStats({
          totalTasks: tasks.length,
          completedTasks: completed,
          inProgressTasks: inProgress,
          pendingTasks: todo,
          overdueCount: overdue,
          completionRate,
          totalUsers: users.length,
          totalDepartments: departments.length
        });
      } else if (currentUser.role === 'hod') {
        // For Department Admins, fetch department-wide stats
        // The /tasks endpoint already filters by managed departments for hod
        const [tasksRes, usersRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/users')
        ]);

        const tasks = tasksRes.data.tasks || [];
        const allUsers = usersRes.data.data || [];

        // Get managed department IDs from user object
        let managedDeptIds = [];
        if (currentUser.managed_department_ids) {
          managedDeptIds = typeof currentUser.managed_department_ids === 'string' 
            ? JSON.parse(currentUser.managed_department_ids) 
            : currentUser.managed_department_ids;
        }
        
        // Include own department in the list
        const allDeptIds = [...new Set([...managedDeptIds, currentUser.department_id])].filter(id => id);

        // Filter users from the managed departments
        const deptUsers = allUsers.filter(u => 
          allDeptIds.includes(u.department_id)
        );

        const completed = tasks.filter(t => t.status === 'completed').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        const todo = tasks.filter(t => t.status === 'todo').length;
        const overdue = tasks.filter(t => {
          if (t.status === 'completed') return false;
          if (!t.due_date) return false;
          return new Date(t.due_date) < new Date();
        }).length;
        const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

        setStats({
          totalTasks: tasks.length,
          completedTasks: completed,
          inProgressTasks: inProgress,
          pendingTasks: todo,
          overdueCount: overdue,
          completionRate,
          totalUsers: deptUsers.length
        });
      } else {
        // For regular employees, fetch their own tasks
        const response = await api.get('/tasks', { params: { my_tasks: true } });
        const tasks = response.data.tasks || [];

        const completed = tasks.filter(t => t.status === 'completed').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        const todo = tasks.filter(t => t.status === 'todo').length;
        const overdue = tasks.filter(t => {
          if (t.status === 'completed') return false;
          if (!t.due_date) return false;
          return new Date(t.due_date) < new Date();
        }).length;
        const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

        setStats({
          totalTasks: tasks.length,
          completedTasks: completed,
          inProgressTasks: inProgress,
          pendingTasks: todo,
          overdueCount: overdue,
          completionRate
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Backend supports name/phone/profile_picture; email is optionally supported.
      const response = await userAPI.updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      });

      // Prefer a fresh /me payload (includes relations like departmentRelation).
      const updatedUser = response?.data?.user;
      if (updatedUser) {
        setUser(updatedUser);
      } else {
        const meRes = await authAPI.me();
        if (meRes?.data?.user) {
          setUser(meRes.data.user);
        }
      }
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.warning('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.warning('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await authAPI.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        new_password_confirmation: passwordData.confirmPassword,
      });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsChangingPassword(false);
      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setFormData({
      name: currentUser.name || currentUser.full_name || '',
      email: currentUser.email || '',
      phone: currentUser.phone || ''
    });
    setIsEditing(false);
  };

  const handleRestartTour = async () => {
    setRestartingTour(true);
    try {
      await api.post('/users/onboarding-reset');
      updateUser({ onboarding_completed: false });
      localStorage.removeItem('onboarding_completed');
      toast.success('Tour reset! Refresh the page to start the onboarding guide.');
      // Optional: auto-refresh after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error resetting tour:', error);
      toast.error('Failed to reset tour');
    } finally {
      setRestartingTour(false);
    }
  };

  const cancelPasswordChange = () => {
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsChangingPassword(false);
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {currentUser.role === 'admin' 
            ? 'System Overview' 
            : currentUser.role === 'hod' 
              ? 'Department Overview' 
              : 'My Profile'}
        </h1>
        <p className="text-gray-600 mt-1">
          {currentUser.role === 'admin' 
            ? 'System-wide statistics and account information'
            : currentUser.role === 'hod'
              ? 'Department-wide statistics and account information'
              : 'View and manage your account information'}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${currentUser.role === 'admin' ? 'lg:grid-cols-4' : currentUser.role === 'hod' ? 'lg:grid-cols-3' : 'lg:grid-cols-6'} gap-4`}>
        {currentUser.role === 'admin' && (
          <>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalUsers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Departments</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.totalDepartments || 0}</p>
                </div>
                <Building2 className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
          </>
        )}

        {currentUser.role === 'hod' && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Department Employees</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalUsers || 0}</p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.inProgressTasks}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingTasks}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdueCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion</p>
              <p className="text-2xl font-bold text-green-600">{stats.completionRate}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl">
        {/* Profile Information */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Full Name
                    </div>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </div>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </div>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Department (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Department
                    </div>
                  </label>
                  <input
                    type="text"
                    value={currentUser.departmentRelation?.name || currentUser.department_name || currentUser.department || 'N/A'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>

                {/* Showroom (Read-only) - Only shown if user has branches */}
                {currentUser.branches && currentUser.branches.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Showroom
                      </div>
                    </label>
                    <input
                      type="text"
                      value={currentUser.branches.map(b => b.name).join(', ')}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Role (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Role
                    </div>
                  </label>
                  <input
                    type="text"
                    value={currentUser.role === 'admin' ? 'ADMIN' : currentUser.role === 'hod' ? 'HEAD OF DEPARTMENT (HOD)' : currentUser.role === 'senior_employee' ? 'SENIOR EMPLOYEE' : 'EMPLOYEE'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>

                {/* Member Since (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Member Since
                    </div>
                  </label>
                  <input
                    type="text"
                    value={currentUser.created_at ? format(new Date(currentUser.created_at), 'MMMM dd, yyyy') : 'N/A'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Change Password Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
              {!isChangingPassword && (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Change Password
                </button>
              )}
            </div>

            {isChangingPassword && (
              <form onSubmit={handleChangePassword}>
                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelPasswordChange}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Onboarding Tour Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Play className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Onboarding Tour</h2>
                <p className="text-sm text-gray-500">
                  Need a refresher? Restart the guided tour to learn about system features.
                </p>
              </div>
            </div>
            <button
              onClick={handleRestartTour}
              disabled={restartingTour}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className={`w-4 h-4 ${restartingTour ? 'animate-spin' : ''}`} />
              {restartingTour ? 'Resetting...' : 'Restart Tour'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
