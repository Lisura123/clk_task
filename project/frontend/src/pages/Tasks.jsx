import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Eye, X, Calendar, ClipboardList, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { taskAPI, departmentAPI, userAPI } from '../services/api';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import DailyWorkLog from '../components/DailyWorkLog';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function Tasks() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWorkLogModal, setShowWorkLogModal] = useState(false);
  const [workLogTask, setWorkLogTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assigned_to: '',
    department_id: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    overdue: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks
      const tasksRes = await (
        user.role === 'admin' || user.role === 'senior_employee'
          ? taskAPI.getAllTasks()
          : user.role === 'hod'
          ? taskAPI.getAllTasks()
          : taskAPI.getMyTasks()
      );
      
      const allTasks = tasksRes.data.tasks || [];
      setTasks(allTasks);
      
      // Fetch departments
      const deptsRes = await departmentAPI.getAllDepartments();
      const deptData = Array.isArray(deptsRes.data) ? deptsRes.data : (deptsRes.data?.data || []);
      console.log('Departments fetched:', deptData.length, deptData);
      setDepartments(deptData);
      
      // Fetch users based on role
      let usersList = [];
      
      if (user?.role === 'admin' || user?.role === 'senior_employee' || user?.role === 'hod') {
        console.log('Fetching all employees for role:', user?.role);
        
        // Fetch employees from all departments
        if (deptData.length > 0) {
          const allEmployees = [];
          const seenIds = new Set();
          
          for (const dept of deptData) {
            try {
              console.log(`Fetching employees for dept ${dept.id} (${dept.name})`);
              const empRes = await departmentAPI.getEmployees(dept.id, { status: 'active', per_page: 100 });
              console.log(`Dept ${dept.id} response:`, empRes.data);
              
              // Handle paginated response
              const employees = empRes.data?.data || empRes.data || [];
              console.log(`Dept ${dept.id} employees count:`, employees.length);
              
              if (Array.isArray(employees)) {
                employees.forEach(emp => {
                  if (emp && emp.id && !seenIds.has(emp.id)) {
                    seenIds.add(emp.id);
                    allEmployees.push(emp);
                  }
                });
              }
            } catch (err) {
              console.error(`Error fetching employees for dept ${dept.id}:`, err);
            }
          }
          
          usersList = allEmployees;
          console.log('Total unique employees fetched:', usersList.length);
        }
      }
      
      // Add current user if not already included
      const currentUserInList = usersList.find(u => u.id === user.id);
      if (!currentUserInList) {
        usersList.push({
          id: user.id,
          username: user.username,
          name: user.name,
          department_id: user.department_id,
          status: 'active'
        });
      }
      setUsers(usersList);
      
      // Calculate stats
      const now = new Date();
      const overdue = allTasks.filter(t => new Date(t.due_date) < now && t.status !== 'completed').length;
      
      setStats({
        total: allTasks.length,
        completed: allTasks.filter(t => t.status === 'completed').length,
        inProgress: allTasks.filter(t => t.status === 'in-progress').length,
        pending: allTasks.filter(t => t.status === 'todo').length,
        overdue: overdue
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set department filter for dept admin after departments are loaded
  useEffect(() => {
    if (user?.role === 'hod' && departments.length > 0 && departmentFilter === 'all') {
      // For HOD, check how many departments they manage
      const managedIds = (user.managed_department_ids || [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0);
      
      const managedDepts = departments.filter(d => 
        managedIds.includes(Number(d.id)) || Number(d.id) === Number(user.department_id)
      );
      
      // If HOD manages multiple departments, keep "all" to show all their tasks
      // If only one department, set it as the filter
      if (managedDepts.length === 1) {
        setDepartmentFilter(managedDepts[0].name);
      }
      // If multiple, leave as 'all' so they see all their departments' tasks
    }
  }, [departments, user]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    // For HODs with "all" filter, only show tasks from their managed departments
    let matchesDepartment = true;
    if (departmentFilter === 'all') {
      if (user?.role === 'hod') {
        const managedIds = (user.managed_department_ids || [])
          .map(id => Number(id))
          .filter(id => Number.isFinite(id) && id > 0);
        const managedDeptNames = departments
          .filter(d => managedIds.includes(Number(d.id)) || Number(d.id) === Number(user.department_id))
          .map(d => d.name);
        matchesDepartment = managedDeptNames.includes(task.department);
      }
      // For admin, 'all' means all departments - no filtering needed
    } else {
      matchesDepartment = task.department === departmentFilter;
    }
    
    let matchesDateRange = true;
    if (dateFrom) {
      matchesDateRange = matchesDateRange && new Date(task.due_date) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDateRange = matchesDateRange && new Date(task.due_date) <= new Date(dateTo);
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesDepartment && matchesDateRange;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Resolve department name based on role
      let deptName = '';
      
      if (user?.role === 'hod') {
        // For HOD, use their managed department
        const managedIds = (user.managed_department_ids || [])
          .map(id => Number(id))
          .filter(id => Number.isFinite(id) && id > 0);
        
        if (managedIds.length > 0) {
          const managedDept = departments.find(d => managedIds.includes(Number(d.id)));
          deptName = managedDept?.name || '';
        }
        
        // Fallback to department_id if no managed departments
        if (!deptName && user.department_id) {
          deptName = departments.find(d => Number(d.id) === Number(user.department_id))?.name || '';
        }
      } else {
        // For other roles, use their department
        deptName = user?.department || (departments.find(d => parseInt(d.id) === parseInt(user?.department_id))?.name) || '';
      }
      
      // Validate department is not empty
      if (!deptName) {
        toast.error('Unable to determine department. Please ensure you are assigned to a department.');
        return;
      }
      
      // Map frontend 'urgent' to backend-supported 'high'
      const priorityValue = formData.priority === 'urgent' ? 'high' : formData.priority;

      const taskData = {
        title: formData.title,
        description: formData.description || null,
        department: deptName, // backend expects department name (string)
        assigned_to_id: formData.assigned_to ? parseInt(formData.assigned_to) : null,
        priority: priorityValue,
        due_date: formData.due_date || null,
        status: 'todo'
      };
      
      console.log('Creating task with data:', taskData);
      const response = await taskAPI.create(taskData);
      console.log('Task created successfully:', response);
      
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        assigned_to: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating task:', error);
      console.error('Error response:', error.response?.data);
      
      // Better error message display
      let errorMessage = 'Failed to create task';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        errorMessage = Object.values(errors).flat().join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date?.split('T')[0],
      assigned_to: task.assigned_to || '',
      department_id: task.department_id || ''
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await taskAPI.update(selectedTask.id, formData);
      setShowEditModal(false);
      setSelectedTask(null);
      fetchData();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (taskId) => {
    const confirmed = await confirm({
      type: 'danger',
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    try {
      await taskAPI.delete(taskId);
      toast.success('Task deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Tasks</h1>
          <p className="text-gray-600 mt-1">Manage and track all tasks</p>
        </div>
        {(user.role === 'admin' || user.role === 'hod' || user.role === 'senior_employee') && (
          <button
            onClick={() => {
              // Set default department for dept admin or senior employee
              let defaultDeptId = '';
              if (user.role === 'hod' || user.role === 'senior_employee') {
                // Use user's own department first (most likely has employees), 
                // then fall back to first managed department
                if (user.department_id) {
                  defaultDeptId = Number(user.department_id);
                } else {
                  const managedIds = (user.managed_department_ids || [])
                    .map(id => Number(id))
                    .filter(id => Number.isFinite(id) && id > 0);
                  if (managedIds.length > 0) {
                    defaultDeptId = managedIds[0];
                  }
                }
              }
              
              setFormData({
                title: '',
                description: '',
                priority: 'medium',
                due_date: '',
                assigned_to: '',
                department_id: defaultDeptId
              });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Task
          </button>
        )}
      </div>

      {/* Statistics - Scrollable on mobile */}
      <div className="mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex sm:grid sm:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto pb-2 sm:pb-0 snap-x snap-mandatory scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex-shrink-0 w-[140px] sm:w-auto bg-white rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200 snap-start">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">Total</h3>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-black">{stats.total}</p>
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto bg-white rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200 snap-start">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">Completed</h3>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto bg-white rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200 snap-start">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">In Progress</h3>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto bg-white rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200 snap-start">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">Pending</h3>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="flex-shrink-0 w-[140px] sm:w-auto bg-white rounded-lg shadow-sm p-3 sm:p-4 border border-gray-200 snap-start">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              <h3 className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap">Overdue</h3>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700">Filters</h3>
          {(statusFilter !== 'all' || priorityFilter !== 'all' || departmentFilter !== 'all' || dateFrom || dateTo || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setDepartmentFilter('all');
                setDateFrom('');
                setDateTo('');
                setSearchTerm('');
              }}
              className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 active:scale-95 transition-transform"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Clear</span>
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
          {/* Search - Full width on mobile */}
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

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-2 sm:pr-4 py-2 text-xs sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <Filter className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-2 sm:pr-4 py-2 text-xs sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className={`w-full px-2 sm:px-4 py-2 text-xs sm:text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none bg-white ${
              user?.role === 'hod' ? 'border-orange-300 bg-orange-50' : 'border-gray-300'
            }`}
          >
            {user?.role === 'hod' ? (
              // For HODs, show "All My Departments" option if they manage multiple
              <>
                {(() => {
                  const managedIds = (user.managed_department_ids || [])
                    .map(id => Number(id))
                    .filter(id => Number.isFinite(id) && id > 0);
                  const managedDepts = departments.filter(dept => 
                    managedIds.includes(Number(dept.id)) || Number(dept.id) === Number(user.department_id)
                  );
                  return managedDepts.length > 1 && <option value="all">All My Departments</option>;
                })()}
                {departments
                  .filter(dept => {
                    const managedIds = (user.managed_department_ids || [])
                      .map(id => Number(id))
                      .filter(id => Number.isFinite(id) && id > 0);
                    return managedIds.includes(Number(dept.id)) || Number(dept.id) === Number(user.department_id);
                  })
                  .map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))
                }
              </>
            ) : (
              <>
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </>
            )}
          </select>

          {/* Date From */}
          <div className="relative">
            <Calendar className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="date"
              placeholder="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-2 sm:pr-4 py-2 text-xs sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <Calendar className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="date"
              placeholder="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-2 sm:pr-4 py-2 text-xs sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
        <div className="text-xs sm:text-sm text-gray-600 mt-2">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Tasks List - Card view on mobile, table on desktop */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 active:bg-gray-50 transition-colors"
                  onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                >
                  {/* Task Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-black truncate">{task.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{task.description}</p>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500">Progress</span>
                      <span className="text-xs font-semibold text-gray-700">{task.progress || 0}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-1.5 w-full">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${
                          (task.progress || 0) === 100 ? 'bg-green-600' :
                          (task.progress || 0) >= 75 ? 'bg-blue-600' :
                          (task.progress || 0) >= 50 ? 'bg-yellow-600' :
                          (task.progress || 0) >= 25 ? 'bg-orange-600' :
                          'bg-red-600'
                        }`}
                        style={{ width: `${task.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Task Meta */}
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      {task.subtasks_count > 0 && (
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {task.completed_subtasks_count}/{task.subtasks_count} sub
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  
                  {/* Assignee & Actions */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-600 truncate max-w-[120px]">
                      {task.assigned_to_name || 'Unassigned'}
                    </span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg active:scale-95 transition-transform"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(task.assigned_to_id === user?.id || task.created_by_id === user?.id || user.role === 'admin' || user.role === 'hod' || user.role === 'senior_employee') && (
                        <button 
                          onClick={() => {
                            setWorkLogTask(task);
                            setShowWorkLogModal(true);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg active:scale-95 transition-transform"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      {(user.role === 'admin' || user.role === 'hod' || user.role === 'senior_employee') && (
                        <>
                          <button 
                            onClick={() => handleEdit(task)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg active:scale-95 transition-transform"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(task.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg active:scale-95 transition-transform"
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
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200">
                No tasks found
              </div>
            )}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/dashboard/tasks/${task.id}`)}>
                        <td className="px-4 lg:px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-black">{task.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                            {task.subtasks_count > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                  {task.completed_subtasks_count}/{task.subtasks_count} sub-tasks
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-20 lg:w-24">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  (task.progress || 0) === 100 ? 'bg-green-600' :
                                  (task.progress || 0) >= 75 ? 'bg-blue-600' :
                                  (task.progress || 0) >= 50 ? 'bg-yellow-600' :
                                  (task.progress || 0) >= 25 ? 'bg-orange-600' :
                                  'bg-red-600'
                                }`}
                                style={{ width: `${task.progress || 0}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-semibold text-gray-700 min-w-[35px]">
                              {task.progress || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(task.due_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {task.assigned_to_name || 'Unassigned'}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 lg:gap-2">
                            <button 
                              onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="View Task"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {(task.assigned_to_id === user?.id || task.created_by_id === user?.id || user.role === 'admin' || user.role === 'hod' || user.role === 'senior_employee') && (
                              <button 
                                onClick={() => {
                                  setWorkLogTask(task);
                                  setShowWorkLogModal(true);
                                }}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Work Logs"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}
                            {(user.role === 'admin' || user.role === 'hod' || user.role === 'senior_employee') && (
                              <>
                                <button 
                                  onClick={() => handleEdit(task)}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                                  title="Edit Task"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDelete(task.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No tasks found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      
      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-4 sm:p-6 w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-black">Create New Task</h2>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-2 -mr-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg active:scale-95 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              {/* Department field for create modal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                {(() => {
                  const canSelectAllDepts = ['admin', 'hod', 'senior_employee'].includes(user.role);
                  
                  return (
                    <>
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
                      {canSelectAllDepts && (
                        <p className="text-xs text-blue-600 mt-1">You can assign tasks to any department</p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                {(() => {
                  const canAssignCrossDept = ['admin', 'hod', 'senior_employee'].includes(user.role);
                  
                  // Filter users - show all if no department selected, or filter by department
                  const filteredUsers = users.filter(u => {
                    if (u.status !== 'active') return false;
                    // If cross-department assignment is allowed and no specific department selected, show all
                    if (canAssignCrossDept && !formData.department_id) return true;
                    // If a department is selected, filter by it
                    if (formData.department_id) {
                      return parseInt(u.department_id) === parseInt(formData.department_id);
                    }
                    // Default: filter by user's own department
                    return parseInt(u.department_id) === parseInt(user.department_id);
                  });

                  // Group users by department for better UX
                  const groupedUsers = {};
                  filteredUsers.forEach(u => {
                    const deptId = u.department_id || 'unassigned';
                    const dept = departments.find(d => d.id === parseInt(u.department_id));
                    const deptName = dept?.name || 'No Department';
                    if (!groupedUsers[deptName]) {
                      groupedUsers[deptName] = [];
                    }
                    groupedUsers[deptName].push(u);
                  });

                  const showGrouped = canAssignCrossDept && !formData.department_id && Object.keys(groupedUsers).length > 1;

                  return (
                    <>
                      <select
                        value={formData.assigned_to}
                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">Unassigned</option>
                        {showGrouped ? (
                          // Group by department when no specific department is selected
                          Object.entries(groupedUsers).sort((a, b) => a[0].localeCompare(b[0])).map(([deptName, deptUsers]) => (
                            <optgroup key={deptName} label={deptName}>
                              {deptUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.username || u.name}</option>
                              ))}
                            </optgroup>
                          ))
                        ) : (
                          // Simple list when department is selected
                          filteredUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.username || u.name}</option>
                          ))
                        )}
                      </select>
                      {canAssignCrossDept && (
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.department_id 
                            ? `Showing employees from selected department` 
                            : `Select a department to filter employees, or choose from all`}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex gap-3 mt-6 pb-4 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 text-gray-700 rounded-xl sm:rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all text-sm sm:text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 sm:py-2 bg-red-600 text-white rounded-xl sm:rounded-lg hover:bg-red-700 active:scale-[0.98] transition-all text-sm sm:text-base font-medium"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-4 sm:p-6 w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-black">Edit Task</h2>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="p-2 -mr-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg active:scale-95 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department *</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={user.role === 'hod'}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {user.role === 'hod' && (
                  <p className="text-xs text-gray-500 mt-1">Department cannot be changed</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Unassigned</option>
                  {users.filter(u => u.status === 'active').map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.department_name})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 mt-6 pb-4 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 text-gray-700 rounded-xl sm:rounded-lg hover:bg-gray-50 active:scale-[0.98] transition-all text-sm sm:text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 sm:py-2 bg-red-600 text-white rounded-xl sm:rounded-lg hover:bg-red-700 active:scale-[0.98] transition-all text-sm sm:text-base font-medium"
                >
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Work Log Modal */}
      {showWorkLogModal && workLogTask && (
        <DailyWorkLog
          task={workLogTask}
          onClose={() => {
            setShowWorkLogModal(false);
            setWorkLogTask(null);
          }}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}
