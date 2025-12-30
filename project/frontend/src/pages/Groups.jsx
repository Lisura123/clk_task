import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Users as UsersIcon, UserPlus, X } from 'lucide-react';
import { groupAPI, userAPI, departmentAPI } from '../services/api';
import useAuthStore from '../store/authStore';

export default function Groups() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
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
      const [groupsRes, deptsRes, usersRes] = await Promise.all([
        groupAPI.getAll(),
        departmentAPI.getAllDepartments(),
        userAPI.getAll()
      ]);

      setGroups(groupsRes.data.data || []);
      
      let availableDepartments = deptsRes.data || [];
      if (user?.role === 'dept_admin') {
        const managedDeptIds = user.managed_department_ids || [];
        availableDepartments = availableDepartments.filter(dept => 
          managedDeptIds.includes(dept.id)
        );
      }
      setDepartments(availableDepartments);
      setEmployees(usersRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    const defaultDeptId = user?.role === 'dept_admin' && departments.length > 0 
      ? departments[0].id 
      : '';
    
    setFormData({
      name: '',
      description: '',
      department_id: defaultDeptId,
      member_ids: [],
      leader_ids: []
    });
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
      alert(errorMsg);
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
      alert(errorMsg);
    }
  };

  const handleDelete = async (groupId) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      await groupAPI.delete(groupId);
      fetchData();
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
    }
  };

  const toggleMember = (userId) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId]
    }));
  };

  const toggleLeader = (userId) => {
    setFormData(prev => ({
      ...prev,
      leader_ids: prev.leader_ids.includes(userId)
        ? prev.leader_ids.filter(id => id !== userId)
        : [...prev.leader_ids, userId]
    }));
  };

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'all' || g.department_id === parseInt(departmentFilter);
    return matchesSearch && matchesDept;
  });

  const availableEmployees = formData.department_id
    ? employees.filter(emp => emp.department_id === parseInt(formData.department_id))
    : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-black">Groups</h1>
        <p className="text-gray-600 mt-1">Manage department groups and teams</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {user.role !== 'dept_admin' && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <UsersIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <span className="text-xs text-gray-500">{group.member_count || 0} members</span>
                </div>

                <h3 className="text-lg font-semibold text-black mb-1">{group.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{group.description || 'No description'}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-medium text-black">{group.department?.name}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(group)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
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
              <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No groups found</p>
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
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value, member_ids: [], leader_ids: [] })}
                  disabled={user?.role === 'dept_admin'}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    user?.role === 'dept_admin' ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {user?.role === 'dept_admin' && (
                  <p className="text-blue-600 text-xs mt-1">
                    You can only create groups in your managed department
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Members <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50">
                  {availableEmployees.length > 0 ? (
                    availableEmployees.map(emp => (
                      <div key={emp.id} className="flex items-center justify-between p-2 hover:bg-white rounded">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={formData.member_ids.includes(emp.id)}
                            onChange={() => toggleMember(emp.id)}
                            className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{emp.name || emp.username}</span>
                        </label>
                        {formData.member_ids.includes(emp.id) && (
                          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.leader_ids.includes(emp.id)}
                              onChange={() => toggleLeader(emp.id)}
                              className="w-3 h-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            Leader
                          </label>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Select a department first</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select members and optionally mark some as leaders
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
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  disabled={formData.member_ids.length === 0}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Members <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50">
                  {availableEmployees.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-2 hover:bg-white rounded">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={formData.member_ids.includes(emp.id)}
                          onChange={() => toggleMember(emp.id)}
                          className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{emp.name || emp.username}</span>
                      </label>
                      {formData.member_ids.includes(emp.id) && (
                        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.leader_ids.includes(emp.id)}
                            onChange={() => toggleLeader(emp.id)}
                            className="w-3 h-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          Leader
                        </label>
                      )}
                    </div>
                  ))}
                </div>
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
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  disabled={formData.member_ids.length === 0}
                >
                  Update Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
