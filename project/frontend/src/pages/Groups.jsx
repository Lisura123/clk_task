import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Users as UsersIcon, UserPlus, X, MessageCircle, Building2, Crown, ChevronRight } from 'lucide-react';
import { groupAPI, userAPI, departmentAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import GroupChat from '../components/GroupChat';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function Groups() {
  const { user } = useAuthStore();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [groups, setGroups] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [chatGroup, setChatGroup] = useState(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department_id: '',
    member_ids: [],
    leader_ids: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Debug: Log user from store
      console.log('=== GROUPS DEBUG ===');
      console.log('User from store:', user);
      console.log('User managed_department_ids:', user?.managed_department_ids);
      console.log('typeof managed_department_ids:', typeof user?.managed_department_ids);
      
      const [groupsRes, deptsRes, usersRes] = await Promise.all([
        groupAPI.getAll(),
        departmentAPI.getAllDepartments(),
        userAPI.getAll()
      ]);

      console.log('Groups fetchData:', {
        user,
        managedDeptIds: user?.managed_department_ids,
        allDepts: deptsRes.data,
        allUsers: usersRes.data.data
      });

      setGroups(groupsRes.data.data || []);
      
      let availableDepartments = deptsRes.data || [];
      
      // Admin, HOD, and Senior Employee can see ALL departments
      // No filtering needed - they all have cross-department access
      
      setDepartments(availableDepartments);
      setEmployees(usersRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    // Don't auto-select department - let user choose
    setFormData({
      name: '',
      description: '',
      department_id: '',
      member_ids: [],
      leader_ids: []
    });
    setMemberSearchTerm('');
    setShowCreateModal(true);
  };

  const handleEdit = (group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      department_id: group.department_id,
      member_ids: group.members.map(m => m.id),
      leader_ids: group.members.filter(m => m.pivot.role === 'leader').map(m => m.id)
    });
    setMemberSearchTerm('');
    setShowEditModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await groupAPI.create(formData);
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating group:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create group';
      toast.error(errorMsg);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await groupAPI.update(selectedGroup.id, formData);
      setShowEditModal(false);
      setSelectedGroup(null);
      fetchData();
    } catch (error) {
      console.error('Error updating group:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update group';
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (groupId) => {
    const confirmed = await confirmDialog({
      type: 'danger',
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    try {
      await groupAPI.delete(groupId);
      toast.success('Group deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const toggleMember = (userId) => {
    setFormData(prev => {
      const newMemberIds = prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId];
      
      // If unchecking a member who is a leader, remove them from leaders too
      const newLeaderIds = prev.member_ids.includes(userId)
        ? prev.leader_ids.filter(id => id !== userId)
        : prev.leader_ids;
      
      return {
        ...prev,
        member_ids: newMemberIds,
        leader_ids: newLeaderIds
      };
    });
  };

  const toggleLeader = (userId) => {
    setFormData(prev => ({
      ...prev,
      leader_ids: prev.leader_ids.includes(userId)
        ? prev.leader_ids.filter(id => id !== userId)
        : [...prev.leader_ids, userId]
    }));
  };

  const selectAllMembers = () => {
    const filteredEmployeeIds = filteredAvailableEmployees.map(emp => emp.id);
    setFormData(prev => ({
      ...prev,
      member_ids: filteredEmployeeIds
    }));
  };

  const clearAllMembers = () => {
    setFormData(prev => ({
      ...prev,
      member_ids: [],
      leader_ids: []
    }));
  };

  const makeAllLeaders = () => {
    setFormData(prev => ({
      ...prev,
      leader_ids: [...prev.member_ids]
    }));
  };

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'all' || g.department_id === parseInt(departmentFilter);
    return matchesSearch && matchesDept;
  });

  // For Admin, HOD, and Senior Employee - show ALL employees (cross-department)
  // When a department is selected, still show all employees but highlight the ones from that department
  const canSelectCrossDept = ['admin', 'hod', 'senior_employee'].includes(user?.role);
  
  const availableEmployees = formData.department_id
    ? (canSelectCrossDept 
        ? employees // Show all employees for cross-department selection
        : employees.filter((emp) => Number(emp.department_id) === Number(formData.department_id)))
    : (canSelectCrossDept ? employees : []);

  const filteredAvailableEmployees = availableEmployees.filter(emp =>
    (emp.name || emp.username || '').toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  // Admin, HOD, and Senior Employees can create/edit/delete groups
  const canManageGroups = user?.role === 'admin' || user?.role === 'hod' || user?.role === 'senior_employee';

  return (
    <div className="min-h-screen">
      {/* Modern Header with Gradient - Updated Jan 16 2026 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <UsersIcon className="w-5 h-5 text-white" />
              </div>
              Groups
            </h1>
            <p className="text-gray-500 mt-2 ml-13">{canManageGroups ? 'Manage department groups and team collaboration' : 'View department groups and team collaboration'}</p>
          </div>
          {canManageGroups && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 transition-all shadow-lg shadow-red-500/25 font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Group
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{groups.length}</p>
              <p className="text-xs text-gray-500">Total Groups</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{groups.reduce((acc, g) => acc + (g.member_count || 0), 0)}</p>
              <p className="text-xs text-gray-500">Total Members</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
              <p className="text-xs text-gray-500">Departments</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{groups.filter(g => (g.member_count || 0) > 0).length}</p>
              <p className="text-xs text-gray-500">Active Groups</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search groups by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50"
              />
            </div>
          </div>

          {user.role !== 'hod' && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-gray-50 min-w-[180px]"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300 group">
                {/* Card Header with Gradient */}
                <div className="h-2 bg-gradient-to-r from-red-500 via-red-400 to-orange-400"></div>
                
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                        <UsersIcon className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {group.department?.name || 'No Department'}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                      {group.member_count || 0} members
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                    {group.description || 'No description provided for this group'}
                  </p>

                  {/* Members Preview */}
                  {group.members && group.members.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 4).map((member, idx) => (
                          <div 
                            key={member.id} 
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                            title={member.name}
                          >
                            {member.name?.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {group.members.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-500">
                            +{group.members.length - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">Team members</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setChatGroup(group)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat
                    </button>
                    {canManageGroups && (
                      <>
                        <button
                          onClick={() => handleEdit(group)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
                          className="flex items-center justify-center px-3 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UsersIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No groups found</h3>
                <p className="text-gray-500 mb-4">{canManageGroups ? 'Create your first group to start collaborating' : 'No groups available yet'}</p>
                {canManageGroups && (
                  <button
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Group
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Create New Group</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.department_id || ''}
                  onChange={(e) => setFormData({ ...formData, department_id: Number(e.target.value), member_ids: [], leader_ids: [] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {user?.role === 'hod' && departments.length > 0 && (
                  <p className="text-blue-600 text-xs mt-1">
                    You can create groups in your managed departments
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Members <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({formData.member_ids.length} selected, {formData.leader_ids.length} leader{formData.leader_ids.length !== 1 ? 's' : ''})
                    </span>
                  </label>
                  {availableEmployees.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllMembers}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={clearAllMembers}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Clear All
                      </button>
                      {formData.member_ids.length > 0 && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={makeAllLeaders}
                            className="text-xs text-green-600 hover:text-green-700 font-medium"
                          >
                            All Leaders
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {availableEmployees.length > 0 && (
                  <div className="mb-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={memberSearchTerm}
                        onChange={(e) => setMemberSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                )}

                <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50">
                  {availableEmployees.length > 0 ? (
                    filteredAvailableEmployees.length > 0 ? (
                      filteredAvailableEmployees.map(emp => (
                        <div key={emp.id} className="flex items-center justify-between p-2 hover:bg-white rounded">
                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={formData.member_ids.includes(emp.id)}
                              onChange={() => toggleMember(emp.id)}
                              className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-700">{emp.name || emp.username}</span>
                              <span className="text-xs text-gray-500">{emp.role}</span>
                            </div>
                          </label>
                          {formData.member_ids.includes(emp.id) && (
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.leader_ids.includes(emp.id)}
                                onChange={() => toggleLeader(emp.id)}
                                className="w-3 h-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className={formData.leader_ids.includes(emp.id) ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                                Leader
                              </span>
                            </label>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No members match your search</p>
                    )
                  ) : (
                    <p className="text-sm text-gray-500">Select a department first</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 2 members required. At least 1 leader must be selected.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    formData.member_ids.length >= 2 && formData.leader_ids.length >= 1
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={formData.member_ids.length < 2 || formData.leader_ids.length < 1}
                  title={
                    formData.member_ids.length < 2
                      ? 'At least 2 members required'
                      : formData.leader_ids.length < 1
                      ? 'At least 1 leader required'
                      : ''
                  }
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-black">Edit Group</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.department_id}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Department cannot be changed</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Members <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({formData.member_ids.length} selected, {formData.leader_ids.length} leader{formData.leader_ids.length !== 1 ? 's' : ''})
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllMembers}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllMembers}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear All
                    </button>
                    {formData.member_ids.length > 0 && (
                      <>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={makeAllLeaders}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          All Leaders
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50">
                  {filteredAvailableEmployees.length > 0 ? (
                    filteredAvailableEmployees.map(emp => (
                      <div key={emp.id} className="flex items-center justify-between p-2 hover:bg-white rounded">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={formData.member_ids.includes(emp.id)}
                            onChange={() => toggleMember(emp.id)}
                            className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-700">{emp.name || emp.username}</span>
                            <span className="text-xs text-gray-500">{emp.role}</span>
                          </div>
                        </label>
                        {formData.member_ids.includes(emp.id) && (
                          <label className="flex items-center gap-1 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.leader_ids.includes(emp.id)}
                              onChange={() => toggleLeader(emp.id)}
                              className="w-3 h-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className={formData.leader_ids.includes(emp.id) ? 'text-blue-600 font-medium' : 'text-gray-600'}>
                              Leader
                            </span>
                          </label>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No members match your search</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 2 members required. At least 1 leader must be selected.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    formData.member_ids.length >= 2 && formData.leader_ids.length >= 1
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={formData.member_ids.length < 2 || formData.leader_ids.length < 1}
                  title={
                    formData.member_ids.length < 2
                      ? 'At least 2 members required'
                      : formData.leader_ids.length < 1
                      ? 'At least 1 leader required'
                      : ''
                  }
                >
                  Update Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Chat Modal */}
      {chatGroup && (
        <GroupChat group={chatGroup} onClose={() => setChatGroup(null)} />
      )}
    </div>
  );
}
