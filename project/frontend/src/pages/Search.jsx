import { useState, useEffect } from 'react';
import { Search as SearchIcon, ClipboardList, Users, Filter, X, SlidersHorizontal, Calendar, ArrowUpDown, Building2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { taskAPI, userAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import api from '../services/api';

export default function Search() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [results, setResults] = useState({ tasks: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [departments, setDepartments] = useState([]);
  
  // Advanced filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    department: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const isEmployee = user?.role === 'employee';

  useEffect(() => {
    if (!isEmployee) {
      fetchDepartments();
    }
  }, [isEmployee]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    setLoading(true);
    setSearched(true);
    try {
      const promises = [];
      
      if (searchType === 'all' || searchType === 'tasks') {
        // Employees only see their own tasks
        if (isEmployee) {
          promises.push(taskAPI.getMyTasks());
        } else {
          promises.push(taskAPI.getAllTasks({ search: searchTerm }));
        }
      } else {
        promises.push(Promise.resolve({ data: { tasks: [] } }));
      }

      // Employees cannot search users
      if (!isEmployee && (searchType === 'all' || searchType === 'users')) {
        promises.push(userAPI.getAllUsers());
      } else {
        promises.push(Promise.resolve({ data: { users: [] } }));
      }

      const [tasksRes, usersRes] = await Promise.all(promises);
      
      // Filter tasks
      let tasks = tasksRes.data.tasks || [];
      
      // Apply search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        tasks = tasks.filter(t => 
          t.title?.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower) ||
          t.status?.toLowerCase().includes(searchLower) ||
          t.priority?.toLowerCase().includes(searchLower) ||
          t.department?.toLowerCase().includes(searchLower) ||
          t.assignee_name?.toLowerCase().includes(searchLower)
        );
      }

      // Apply advanced filters
      if (filters.status) {
        tasks = tasks.filter(t => t.status === filters.status);
      }
      if (filters.priority) {
        tasks = tasks.filter(t => t.priority === filters.priority);
      }
      if (filters.department) {
        tasks = tasks.filter(t => t.department === filters.department || t.department_name === filters.department);
      }
      if (filters.dateFrom) {
        tasks = tasks.filter(t => new Date(t.due_date) >= new Date(filters.dateFrom));
      }
      if (filters.dateTo) {
        tasks = tasks.filter(t => new Date(t.due_date) <= new Date(filters.dateTo));
      }

      // Apply sorting
      tasks.sort((a, b) => {
        let aVal, bVal;
        
        switch(filters.sortBy) {
          case 'title':
            aVal = a.title?.toLowerCase() || '';
            bVal = b.title?.toLowerCase() || '';
            break;
          case 'due_date':
            aVal = new Date(a.due_date || 0);
            bVal = new Date(b.due_date || 0);
            break;
          case 'priority':
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            aVal = priorityOrder[a.priority] || 0;
            bVal = priorityOrder[b.priority] || 0;
            break;
          case 'progress':
            aVal = a.progress || 0;
            bVal = b.progress || 0;
            break;
          default: // created_at
            aVal = new Date(a.created_at || 0);
            bVal = new Date(b.created_at || 0);
        }
        
        if (filters.sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
      
      // Filter users
      let users = usersRes.data.users || [];
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        users = users.filter(u => 
          u.username?.toLowerCase().includes(searchLower) ||
          u.email?.toLowerCase().includes(searchLower) ||
          u.full_name?.toLowerCase().includes(searchLower) ||
          u.department_name?.toLowerCase().includes(searchLower)
        );
      }

      setResults({ tasks, users });
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      department: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = () => {
    return filters.status || filters.priority || filters.department || filters.dateFrom || filters.dateTo;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black">{isEmployee ? 'My Tasks Search' : 'Global Search'}</h1>
        <p className="text-gray-600 mt-1">{isEmployee ? 'Search your assigned tasks' : 'Search across tasks and users'}</p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={isEmployee ? "Search your tasks..." : "Search for tasks, users, departments..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-lg"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {!isEmployee && (
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">All</option>
                  <option value="tasks">Tasks</option>
                  <option value="users">Users</option>
                </select>
              )}
              {(searchType === 'all' || searchType === 'tasks') && (
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-3 border rounded-lg transition-colors flex items-center gap-2 ${
                    showFilters || hasActiveFilters() 
                      ? 'bg-red-50 border-red-300 text-red-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  Filters
                  {hasActiveFilters() && (
                    <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">Active</span>
                  )}
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Search
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (searchType === 'all' || searchType === 'tasks') && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Advanced Filters
                </h3>
                {hasActiveFilters() && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {/* Department Filter */}
                {!isEmployee && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      value={filters.department}
                      onChange={(e) => setFilters({...filters, department: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <div className="flex gap-2">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="created_at">Date Created</option>
                      <option value="due_date">Due Date</option>
                      <option value="title">Title</option>
                      <option value="priority">Priority</option>
                      <option value="progress">Progress</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setFilters({...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'})}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                      <ArrowUpDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Due Date From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Due Date To
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <div className="space-y-6">
          {/* Result Summary */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Found: {results.tasks.length} tasks, {results.users.length} users</span>
          </div>

          {/* Tasks Results */}
          {(searchType === 'all' || searchType === 'tasks') && results.tasks.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-black">Tasks ({results.tasks.length})</h2>
              </div>
              <div className="space-y-3">
                {results.tasks.map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-red-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-black mb-1">{task.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                      </div>
                      {task.due_date && (
                        <div className="ml-4 text-right">
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </div>
                          {new Date(task.due_date) < new Date() && task.status !== 'completed' && (
                            <span className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status === 'in-progress' ? 'In Progress' : task.status === 'on-hold' ? 'On Hold' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </span>
                      {task.department_name && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {task.department_name}
                        </span>
                      )}
                      {task.assignee_name && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {task.assignee_name}
                        </span>
                      )}
                    </div>
                    {/* Progress Bar */}
                    {task.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span className="font-medium">{task.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-600 h-2 rounded-full transition-all"
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users Results */}
          {(searchType === 'all' || searchType === 'users') && results.users.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-black">Users ({results.users.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.users.map((user) => (
                  <div key={user.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 font-semibold">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-black truncate">{user.username}</h3>
                        <p className="text-xs text-gray-600 truncate">{user.email}</p>
                        <p className="text-xs text-gray-500">{user.department_name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {results.tasks.length === 0 && results.users.length === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try different keywords or filters</p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!loading && !searched && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Start searching</h3>
          <p className="text-gray-600">Enter keywords to search across the system</p>
        </div>
      )}
    </div>
  );
}
