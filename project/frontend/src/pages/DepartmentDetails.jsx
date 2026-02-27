import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  Users as UsersIcon, 
  Calendar as CalendarIcon, 
  ClipboardList,
  Plus,
  Search,
  Edit2,
  Trash2,
  MessageCircle,
  UserPlus,
  X,
  Save,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Repeat,
  FileText
} from 'lucide-react';
import { departmentAPI, groupAPI, scheduledPlanAPI, taskAPI, userAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import GroupChat from '../components/GroupChat';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function DepartmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [activeTab, setActiveTab] = useState('overview');
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Groups state
  const [groups, setGroups] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [chatGroup, setChatGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    department_id: id,
    member_ids: [],
    leader_ids: []
  });
  
  // Schedule state
  const [schedules, setSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleFormData, setScheduleFormData] = useState({
    title: '',
    description: '',
    department_id: id,
    start_date: '',
    end_date: '',
    notes: '',
    is_recurring: false,
    recurrence_pattern: '',
    recurrence_end_date: ''
  });
  
  // Tasks state
  const [tasks, setTasks] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assigned_to: '',
    department: ''
  });
  
  // Common state
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  useEffect(() => {
    fetchAllData();
  }, [id]);

  useEffect(() => {
    // Refresh data when tab changes (in case data was modified)
    if (department) {
      if (activeTab === 'groups') fetchGroups();
      if (activeTab === 'schedules') fetchSchedules();
      if (activeTab === 'tasks') fetchTasks(department.name);
    }
  }, [activeTab]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [deptRes, employeesRes] = await Promise.all([
        departmentAPI.getById(id),
        departmentAPI.getEmployees(id, { per_page: 100 })
      ]);
      
      const deptData = deptRes.data;
      setDepartment(deptData);
      setEmployees(employeesRes.data.data || employeesRes.data.users || []);
      
      // Fetch all counts after department data is loaded
      await Promise.all([
        fetchGroups(),
        fetchSchedules(),
        fetchTasks(deptData.name)
      ]);
    } catch (error) {
      console.error('Error fetching department:', error);
      toast.error('Failed to load department details');
      navigate('/dashboard/departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await groupAPI.getAll();
      const allGroups = response.data.data || [];
      const deptGroups = allGroups.filter(g => g.department_id === parseInt(id));
      setGroups(deptGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await scheduledPlanAPI.getAll({ department_id: id });
      const schedulesData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchTasks = async (deptName) => {
    try {
      // Use department name for filtering tasks
      const nameToUse = deptName || department?.name;
      if (!nameToUse) return;
      
      const response = await taskAPI.getAllTasks({ department: nameToUse });
      const tasksData = response.data.tasks || [];
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // Group handlers
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await groupAPI.create({ ...groupFormData, department_id: id });
      setShowGroupModal(false);
      resetGroupForm();
      fetchGroups();
      toast.success('Group created successfully');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(error.response?.data?.message || 'Failed to create group');
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    try {
      await groupAPI.update(selectedGroup.id, groupFormData);
      setShowGroupModal(false);
      setSelectedGroup(null);
      resetGroupForm();
      fetchGroups();
      toast.success('Group updated successfully');
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(error.response?.data?.message || 'Failed to update group');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const confirmed = await confirmDialog.show({
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      await groupAPI.delete(groupId);
      fetchGroups();
      toast.success('Group deleted successfully');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const openGroupModal = (group = null) => {
    if (group) {
      setSelectedGroup(group);
      setGroupFormData({
        name: group.name,
        description: group.description || '',
        department_id: id,
        member_ids: group.members.map(m => m.id),
        leader_ids: group.members.filter(m => m.pivot.role === 'leader').map(m => m.id)
      });
    } else {
      resetGroupForm();
    }
    setShowGroupModal(true);
  };

  const resetGroupForm = () => {
    setGroupFormData({
      name: '',
      description: '',
      department_id: id,
      member_ids: [],
      leader_ids: []
    });
    setMemberSearchTerm('');
  };

  // Schedule handlers
  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await scheduledPlanAPI.create({ ...scheduleFormData, department_id: id });
      setShowScheduleModal(false);
      resetScheduleForm();
      fetchSchedules();
      toast.success('Schedule created successfully');
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to create schedule');
    }
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    try {
      await scheduledPlanAPI.update(selectedSchedule.id, scheduleFormData);
      setShowScheduleModal(false);
      setSelectedSchedule(null);
      resetScheduleForm();
      fetchSchedules();
      toast.success('Schedule updated successfully');
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    const confirmed = await confirmDialog.show({
      title: 'Delete Schedule',
      message: 'Are you sure you want to delete this schedule?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      await scheduledPlanAPI.delete(scheduleId);
      fetchSchedules();
      toast.success('Schedule deleted successfully');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const openScheduleModal = (schedule = null) => {
    if (schedule) {
      setSelectedSchedule(schedule);
      setScheduleFormData({
        title: schedule.title,
        description: schedule.description || '',
        department_id: id,
        start_date: schedule.start_date,
        end_date: schedule.end_date || '',
        notes: schedule.notes || '',
        is_recurring: schedule.is_recurring || false,
        recurrence_pattern: schedule.recurrence_pattern || '',
        recurrence_end_date: schedule.recurrence_end_date || ''
      });
    } else {
      resetScheduleForm();
    }
    setShowScheduleModal(true);
  };

  const resetScheduleForm = () => {
    setScheduleFormData({
      title: '',
      description: '',
      department_id: id,
      start_date: '',
      end_date: '',
      notes: '',
      is_recurring: false,
      recurrence_pattern: '',
      recurrence_end_date: ''
    });
  };

  // Task handlers
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await taskAPI.create({ ...taskFormData, department: department?.name });
      setShowTaskModal(false);
      resetTaskForm();
      fetchTasks(department?.name);
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error(error.response?.data?.message || 'Failed to create task');
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      await taskAPI.update(selectedTask.id, taskFormData);
      setShowTaskModal(false);
      setSelectedTask(null);
      resetTaskForm();
      fetchTasks(department?.name);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error(error.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    const confirmed = await confirmDialog.show({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      await taskAPI.delete(taskId);
      fetchTasks(department?.name);
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const openTaskModal = (task = null) => {
    if (task) {
      setSelectedTask(task);
      setTaskFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        due_date: task.due_date,
        assigned_to: task.assigned_to_id || '',
        department_id: id
      });
    } else {
      resetTaskForm();
    }
    setShowTaskModal(true);
  };

  const resetTaskForm = () => {
    setTaskFormData({
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      assigned_to: '',
      department: department?.name || ''
    });
  };

  const toggleMember = (userId) => {
    setGroupFormData(prev => {
      const newMemberIds = prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId];
      
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
    setGroupFormData(prev => ({
      ...prev,
      leader_ids: prev.leader_ids.includes(userId)
        ? prev.leader_ids.filter(id => id !== userId)
        : [...prev.leader_ids, userId]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'todo': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAvailableEmployees = employees.filter(emp =>
    emp.username?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Department not found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/dashboard/departments"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Departments
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-black">{department.name}</h1>
                <p className="text-gray-600 mt-1">{department.description || 'No description'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <UsersIcon className="w-4 h-4" />
            <span>{employees.length} members</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          {department?.name !== 'Administration' && (
            <>
              <button
                onClick={() => setActiveTab('groups')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'groups'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Groups ({groups.length})
              </button>
              <button
                onClick={() => navigate(`/dashboard/schedule?department=${id}`)}
                className="pb-4 px-1 border-b-2 font-medium text-sm transition-colors border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Schedules ({schedules.length})
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'tasks'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tasks ({tasks.length})
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Department Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600">Name</dt>
                <dd className="text-base font-medium text-gray-900">{department.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Description</dt>
                <dd className="text-base text-gray-900">{department.description || 'No description'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Total Members</dt>
                <dd className="text-base font-medium text-gray-900">{employees.length}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
            <div className={`grid ${department?.name === 'Administration' ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              {department?.name !== 'Administration' && (
                <>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <UsersIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{groups.length}</div>
                    <div className="text-sm text-gray-600">Groups</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <CalendarIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">{schedules.length}</div>
                    <div className="text-sm text-gray-600">Schedules</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <ClipboardList className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{tasks.length}</div>
                    <div className="text-sm text-gray-600">Tasks</div>
                  </div>
                </>
              )}
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <UsersIcon className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-600">{employees.length}</div>
                <div className="text-sm text-gray-600">{department?.name === 'Administration' ? 'Admins' : 'Employees'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              onClick={() => openGroupModal()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Group
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups
              .filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(group => (
              <div key={group.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-black">{group.name}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {group.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChatGroup(group)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openGroupModal(group)}
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <UsersIcon className="w-4 h-4 mr-2" />
                  <span>{group.members?.length || 0} members</span>
                </div>
              </div>
            ))}
          </div>

          {groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No groups found</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'schedules' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search schedules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              onClick={() => openScheduleModal()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Schedule
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recurring</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {schedules
                  .filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(schedule => (
                  <tr key={schedule.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{schedule.title}</div>
                      <div className="text-sm text-gray-500 line-clamp-1">{schedule.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(schedule.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {schedule.end_date ? new Date(schedule.end_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {schedule.is_recurring ? (
                        <div className="flex items-center gap-1">
                          <Repeat className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 capitalize">{schedule.recurrence_pattern}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openScheduleModal(schedule)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {schedules.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No schedules found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              onClick={() => openTaskModal()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Task
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tasks
              .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(task => (
              <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-black">{task.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                      {task.assigned_to_name && (
                        <span className="flex items-center gap-1">
                          <UsersIcon className="w-4 h-4" />
                          {task.assigned_to_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openTaskModal(task)}
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No tasks found</p>
            </div>
          )}
        </div>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-black">
                {selectedGroup ? 'Edit Group' : 'Create Group'}
              </h2>
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setSelectedGroup(null);
                  resetGroupForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={selectedGroup ? handleUpdateGroup : handleCreateGroup} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Members
                  </label>
                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="Search members..."
                      value={memberSearchTerm}
                      onChange={(e) => setMemberSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                    {filteredAvailableEmployees.map(emp => (
                      <div key={emp.id} className="flex items-center justify-between p-2 hover:bg-white rounded">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={groupFormData.member_ids.includes(emp.id)}
                            onChange={() => toggleMember(emp.id)}
                            className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                          <span className="text-sm">{emp.username} ({emp.email})</span>
                        </label>
                        {groupFormData.member_ids.includes(emp.id) && (
                          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={groupFormData.leader_ids.includes(emp.id)}
                              onChange={() => toggleLeader(emp.id)}
                              className="w-3 h-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            Leader
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {groupFormData.member_ids.length} member(s) selected
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {selectedGroup ? 'Update Group' : 'Create Group'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false);
                    setSelectedGroup(null);
                    resetGroupForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-black">
                {selectedSchedule ? 'Edit Schedule' : 'Create Schedule'}
              </h2>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSelectedSchedule(null);
                  resetScheduleForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={selectedSchedule ? handleUpdateSchedule : handleCreateSchedule} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={scheduleFormData.title}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={scheduleFormData.description}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={scheduleFormData.start_date}
                      onChange={(e) => setScheduleFormData({ ...scheduleFormData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={scheduleFormData.end_date}
                      onChange={(e) => setScheduleFormData({ ...scheduleFormData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={scheduleFormData.notes}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                {/* Recurring Schedule Options */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleFormData.is_recurring}
                      onChange={(e) => setScheduleFormData({ 
                        ...scheduleFormData, 
                        is_recurring: e.target.checked,
                        recurrence_pattern: e.target.checked ? 'daily' : '',
                        recurrence_end_date: ''
                      })}
                      className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Recurring Schedule</span>
                    </div>
                  </label>

                  {scheduleFormData.is_recurring && (
                    <div className="mt-4 space-y-4 pl-8">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Repeat Pattern
                        </label>
                        <select
                          value={scheduleFormData.recurrence_pattern}
                          onChange={(e) => setScheduleFormData({ ...scheduleFormData, recurrence_pattern: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Recurrence End Date
                        </label>
                        <input
                          type="date"
                          value={scheduleFormData.recurrence_end_date}
                          onChange={(e) => setScheduleFormData({ ...scheduleFormData, recurrence_end_date: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {selectedSchedule ? 'Update Schedule' : 'Create Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setSelectedSchedule(null);
                    resetScheduleForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-black">
                {selectedTask ? 'Edit Task' : 'Create Task'}
              </h2>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                  resetTaskForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={selectedTask ? handleUpdateTask : handleCreateTask} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={taskFormData.title}
                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={taskFormData.description}
                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority *
                    </label>
                    <select
                      value={taskFormData.priority}
                      onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={taskFormData.due_date}
                      onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign To
                  </label>
                  <select
                    value={taskFormData.assigned_to}
                    onChange={(e) => setTaskFormData({ ...taskFormData, assigned_to: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.username} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {selectedTask ? 'Update Task' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedTask(null);
                    resetTaskForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Chat Modal */}
      {chatGroup && (
        <GroupChat
          group={chatGroup}
          onClose={() => setChatGroup(null)}
        />
      )}
    </div>
  );
}
