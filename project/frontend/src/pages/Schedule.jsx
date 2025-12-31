import { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Edit2, 
  Trash2, 
  X,
  MapPin,
  User,
  AlertCircle,
  CheckCircle,
  Repeat,
  List,
  Grid3X3
} from 'lucide-react';
import { scheduledPlanAPI, departmentAPI } from '../services/api';
import useAuthStore from '../store/authStore';

export default function Schedule() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [departments, setDepartments] = useState([]);
  const [departmentUsers, setDepartmentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department_id: '',
    assigned_to: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    type: 'task',
    status: 'pending',
    priority: 'medium',
    is_recurring: false,
    recurrence_pattern: '',
    recurrence_end_date: '',
    notes: '',
    location: ''
  });

  const canManageSchedule = user?.role === 'super_admin' || user?.role === 'dept_admin';

  const planTypes = [
    { value: 'meeting', label: 'Meeting', color: 'bg-blue-100 text-blue-800' },
    { value: 'task', label: 'Task', color: 'bg-green-100 text-green-800' },
    { value: 'event', label: 'Event', color: 'bg-purple-100 text-purple-800' },
    { value: 'deadline', label: 'Deadline', color: 'bg-red-100 text-red-800' },
    { value: 'reminder', label: 'Reminder', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    fetchData();
  }, [currentDate, statusFilter, typeFilter, departmentFilter]);

  useEffect(() => {
    if (formData.department_id) {
      fetchDepartmentUsers(formData.department_id);
    }
  }, [formData.department_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const [calendarRes, deptsRes] = await Promise.all([
        scheduledPlanAPI.getCalendar(year, month, departmentFilter !== 'all' ? departmentFilter : null),
        departmentAPI.getAllDepartments()
      ]);

      setCalendarData(calendarRes.data.plans || {});
      setDepartments(deptsRes.data || []);

      // Also fetch list view data
      const listRes = await scheduledPlanAPI.getAll({
        start_date: `${year}-${String(month).padStart(2, '0')}-01`,
        end_date: new Date(year, month, 0).toISOString().split('T')[0],
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        department_id: departmentFilter !== 'all' ? departmentFilter : undefined
      });
      setPlans(listRes.data || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartmentUsers = async (departmentId) => {
    try {
      const res = await departmentAPI.getEmployees(departmentId, { status: 'active', per_page: 100 });
      setDepartmentUsers(res.data.data || res.data.users || []);
    } catch (error) {
      console.error('Error fetching department users:', error);
      setDepartmentUsers([]);
    }
  };

  const getDefaultDepartmentId = () => {
    if (user?.role === 'dept_admin') {
      const managedIds = (user.managed_department_ids || [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0);
      if (managedIds.length > 0) return managedIds[0];
    }
    return user?.department_id || (departments[0]?.id || '');
  };

  const handleOpenCreateModal = (date = null) => {
    const defaultDeptId = getDefaultDepartmentId();
    setFormData({
      title: '',
      description: '',
      department_id: defaultDeptId,
      assigned_to: '',
      scheduled_date: date || new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      type: 'task',
      status: 'pending',
      priority: 'medium',
      is_recurring: false,
      recurrence_pattern: '',
      recurrence_end_date: '',
      notes: '',
      location: ''
    });
    if (defaultDeptId) {
      fetchDepartmentUsers(defaultDeptId);
    }
    setShowCreateModal(true);
  };

  const handleEdit = (plan) => {
    setSelectedPlan(plan);
    setFormData({
      title: plan.title,
      description: plan.description || '',
      department_id: plan.department_id,
      assigned_to: plan.assigned_to || '',
      scheduled_date: plan.scheduled_date,
      start_time: plan.start_time || '',
      end_time: plan.end_time || '',
      type: plan.type,
      status: plan.status,
      priority: plan.priority,
      is_recurring: plan.is_recurring || false,
      recurrence_pattern: plan.recurrence_pattern || '',
      recurrence_end_date: plan.recurrence_end_date || '',
      notes: plan.notes || '',
      location: plan.location || ''
    });
    fetchDepartmentUsers(plan.department_id);
    setShowEditModal(true);
  };

  const handleView = (plan) => {
    setSelectedPlan(plan);
    setShowViewModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      if (!submitData.assigned_to) delete submitData.assigned_to;
      if (!submitData.start_time) delete submitData.start_time;
      if (!submitData.end_time) delete submitData.end_time;
      if (!submitData.recurrence_pattern) delete submitData.recurrence_pattern;
      if (!submitData.recurrence_end_date) delete submitData.recurrence_end_date;

      await scheduledPlanAPI.create(submitData);
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating plan:', error);
      alert(error.response?.data?.message || 'Failed to create scheduled plan');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      if (!submitData.assigned_to) submitData.assigned_to = null;
      if (!submitData.start_time) submitData.start_time = null;
      if (!submitData.end_time) submitData.end_time = null;
      if (!submitData.recurrence_pattern) submitData.recurrence_pattern = null;
      if (!submitData.recurrence_end_date) submitData.recurrence_end_date = null;

      await scheduledPlanAPI.update(selectedPlan.id, submitData);
      setShowEditModal(false);
      setSelectedPlan(null);
      fetchData();
    } catch (error) {
      console.error('Error updating plan:', error);
      alert(error.response?.data?.message || 'Failed to update scheduled plan');
    }
  };

  const handleDelete = async (plan) => {
    if (!confirm('Are you sure you want to delete this scheduled plan?')) return;
    try {
      await scheduledPlanAPI.delete(plan.id);
      fetchData();
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Failed to delete scheduled plan');
    }
  };

  const getTypeColor = (type) => {
    return planTypes.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    return statusOptions.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    return priorityOptions.find(p => p.value === priority)?.color || 'bg-gray-100 text-gray-800';
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Previous month days
    for (let i = 0; i < startingDay; i++) {
      const prevDate = new Date(year, month, -startingDay + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const renderPlanForm = (isEdit = false) => (
    <form onSubmit={isEdit ? handleUpdate : handleCreate} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
          <select
            value={formData.department_id}
            onChange={(e) => setFormData({ ...formData, department_id: e.target.value, assigned_to: '' })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
          <select
            value={formData.assigned_to}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Unassigned</option>
            {departmentUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name || u.username}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            value={formData.scheduled_date}
            onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
          <input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
          <input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {planTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {priorityOptions.map(priority => (
              <option key={priority.value} value={priority.value}>{priority.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Conference Room A, Zoom Link, etc."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Recurring Section */}
      <div className="border-t pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_recurring}
            onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
            className="rounded border-gray-300"
          />
          <Repeat className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Recurring Plan</span>
        </label>

        {formData.is_recurring && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
              <select
                value={formData.recurrence_pattern}
                onChange={(e) => setFormData({ ...formData, recurrence_pattern: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Pattern</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Until</label>
              <input
                type="date"
                value={formData.recurrence_end_date}
                onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                min={formData.scheduled_date}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {isEdit ? 'Update Plan' : 'Create Plan'}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Schedule</h1>
          <p className="text-gray-600 mt-1">Plan and manage department schedules</p>
        </div>
        {canManageSchedule && (
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Schedule Plan
          </button>
        )}
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-3 py-2 ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid3X3 className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>

          {/* Filters */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            {statusOptions.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            <option value="all">All Types</option>
            {planTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {(user?.role === 'super_admin' || (user?.managed_department_ids?.length > 1)) && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 border-b">
            {dayNames.map(day => (
              <div key={day} className="py-2 text-center text-sm font-medium text-gray-600 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {getDaysInMonth(currentDate).map((day, index) => {
              const dateKey = formatDateKey(day.date);
              const dayPlans = calendarData[dateKey] || [];

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-r border-b last:border-r-0 ${
                    !day.isCurrentMonth ? 'bg-gray-50' : ''
                  } ${isToday(day.date) ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${
                      !day.isCurrentMonth ? 'text-gray-400' : 
                      isToday(day.date) ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {day.date.getDate()}
                    </span>
                    {canManageSchedule && day.isCurrentMonth && (
                      <button
                        onClick={() => handleOpenCreateModal(dateKey)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 hover:opacity-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {dayPlans.slice(0, 3).map((plan, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          const fullPlan = plans.find(p => p.id === plan.id);
                          if (fullPlan) handleView(fullPlan);
                        }}
                        className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${getTypeColor(plan.type)}`}
                      >
                        {plan.start_time && <span className="font-medium">{plan.start_time.slice(0,5)} </span>}
                        {plan.title}
                      </div>
                    ))}
                    {dayPlans.length > 3 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayPlans.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <CalendarIcon className="w-16 h-16 mb-4" />
              <p className="text-lg">No scheduled plans found</p>
              {canManageSchedule && (
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Schedule your first plan
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {plans.map(plan => (
                <div key={plan.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(plan.type)}`}>
                          {plan.type}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(plan.status)}`}>
                          {plan.status?.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(plan.priority)}`}>
                          {plan.priority}
                        </span>
                        {plan.is_recurring && (
                          <span className="flex items-center gap-1 text-xs text-purple-600">
                            <Repeat className="w-3 h-3" />
                            {plan.recurrence_pattern}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900">{plan.title}</h3>
                      {plan.description && (
                        <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {new Date(plan.scheduled_date).toLocaleDateString()}
                        </span>
                        {plan.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {plan.start_time}{plan.end_time && ` - ${plan.end_time}`}
                          </span>
                        )}
                        {plan.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {plan.location}
                          </span>
                        )}
                        {plan.assignee_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {plan.assignee_name}
                          </span>
                        )}
                      </div>
                    </div>
                    {canManageSchedule && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(plan)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Schedule New Plan</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderPlanForm(false)}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit Scheduled Plan</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderPlanForm(true)}
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Plan Details</h2>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1 text-sm rounded-full ${getTypeColor(selectedPlan.type)}`}>
                  {selectedPlan.type}
                </span>
                <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedPlan.status)}`}>
                  {selectedPlan.status?.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 text-sm rounded-full ${getPriorityColor(selectedPlan.priority)}`}>
                  {selectedPlan.priority}
                </span>
              </div>

              <h3 className="text-2xl font-bold mb-2">{selectedPlan.title}</h3>
              
              {selectedPlan.description && (
                <p className="text-gray-600 mb-4">{selectedPlan.description}</p>
              )}

              <div className="space-y-3 text-gray-600">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-gray-400" />
                  <span>{new Date(selectedPlan.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                
                {selectedPlan.start_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <span>{selectedPlan.start_time}{selectedPlan.end_time && ` - ${selectedPlan.end_time}`}</span>
                  </div>
                )}

                {selectedPlan.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span>{selectedPlan.location}</span>
                  </div>
                )}

                {selectedPlan.assignee_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-400" />
                    <span>Assigned to: {selectedPlan.assignee_name}</span>
                  </div>
                )}

                {selectedPlan.is_recurring && (
                  <div className="flex items-center gap-2">
                    <Repeat className="w-5 h-5 text-purple-500" />
                    <span>Repeats {selectedPlan.recurrence_pattern}</span>
                    {selectedPlan.recurrence_end_date && (
                      <span className="text-sm text-gray-400">until {selectedPlan.recurrence_end_date}</span>
                    )}
                  </div>
                )}
              </div>

              {selectedPlan.notes && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-1">Notes</h4>
                  <p className="text-gray-600 text-sm">{selectedPlan.notes}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t text-sm text-gray-400">
                <p>Created by {selectedPlan.creator_name}</p>
                <p>Department: {selectedPlan.department_name}</p>
              </div>

              {canManageSchedule && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleEdit(selectedPlan);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleDelete(selectedPlan);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
