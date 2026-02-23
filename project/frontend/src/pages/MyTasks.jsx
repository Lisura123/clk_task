import { useState, useEffect } from 'react';
import { Search, Filter, Eye, Calendar, Percent } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { taskAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/Toast';

export default function MyTasks() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getMyTasks();
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProgressChange = async (taskId, newProgress) => {
    try {
      // Automatically determine status based on progress
      let newStatus;
      if (newProgress === 0) {
        newStatus = 'pending';
      } else if (newProgress === 100) {
        newStatus = 'completed';
      } else {
        newStatus = 'in_progress';
      }
      
      // Update both progress and status
      await taskAPI.update(taskId, { 
        progress: newProgress,
        status: newStatus
      });
      fetchTasks();
    } catch (error) {
      console.error('Error updating task progress:', error);
      toast.error('Failed to update task progress');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    let matchesDateRange = true;
    if (dateFrom) {
      matchesDateRange = matchesDateRange && new Date(task.due_date) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDateRange = matchesDateRange && new Date(task.due_date) <= new Date(dateTo);
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesDateRange;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
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
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black">My Tasks</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage tasks assigned to you</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
          {/* Search - Full width on mobile */}
          <div className="relative col-span-2 sm:col-span-2 lg:col-span-1">
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
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
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

          {/* Date From */}
          <div className="relative">
            <Calendar className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <input
              type="date"
              placeholder="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-1 sm:pr-4 py-2 text-xs sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
              className="w-full pl-8 sm:pl-10 pr-1 sm:pr-4 py-2 text-xs sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
        <div className="text-xs sm:text-sm text-gray-600 mt-2">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-red-600"></div>
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filteredTasks.map((task) => (
            <div 
              key={task.id} 
              className="bg-white rounded-xl sm:rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow active:bg-gray-50"
              onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-black line-clamp-2 flex-1">{task.title}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/dashboard/tasks/${task.id}`);
                  }}
                  className="p-1.5 sm:p-1 text-blue-600 hover:bg-blue-50 rounded-lg ml-2 active:scale-95 transition-transform"
                  title="View details"
                >
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2">{task.description || 'No description'}</p>

              <div className="flex items-center gap-2 mb-3 sm:mb-4 flex-wrap">
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Progress */}
              <div className="mb-3 sm:mb-4">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Percent className="w-3 h-3 sm:w-4 sm:h-4" />
                    Progress
                  </label>
                  <span className="text-xs sm:text-sm font-medium text-black">{task.progress || 0}%</span>
                </div>
                <div className="w-full h-1.5 sm:h-2 bg-gray-200 rounded-lg relative overflow-hidden">
                  <div 
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{ width: `${task.progress || 0}%` }}
                  ></div>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 hidden sm:block">Contact your manager to update progress</p>
              </div>

              {/* Status - Read-only display */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-gray-700 block mb-1 sm:mb-2">Status</label>
                <div className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium border-2 ${getStatusColor(task.status)} text-center cursor-not-allowed`}>
                  {task.status === 'in_progress' ? 'In Progress' : 
                   task.status === 'on_hold' ? 'On Hold' : 
                   task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl sm:rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
          <Search className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No tasks found</h3>
          <p className="text-sm sm:text-base text-gray-600">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || dateFrom || dateTo
              ? 'Try adjusting your filters'
              : 'You have no tasks assigned to you yet'}
          </p>
        </div>
      )}
    </div>
  );
}
