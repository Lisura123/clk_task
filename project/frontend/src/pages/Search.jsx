import { useState, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, ClipboardList, Users, X, Building2, AlertCircle, UserCog, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { taskAPI, userAPI, departmentAPI } from '../services/api';
import useAuthStore from '../store/authStore';

export default function Search() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [results, setResults] = useState({ tasks: [], users: [], departments: [], hods: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  
  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const isEmployee = user?.role === 'employee';
  const isHOD = user?.role === 'dept_admin';
  const isAdmin = user?.role === 'super_admin';

  // Get managed department IDs for HOD
  const getManagedDeptIds = () => {
    if (!isHOD) return [];
    return (user.managed_department_ids || [])
      .map(id => Number(id))
      .filter(id => Number.isFinite(id) && id > 0);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInitialData = async () => {
    try {
      const promises = [departmentAPI.getAllDepartments()];
      
      // Fetch users for admins and HODs
      if (!isEmployee) {
        promises.push(userAPI.getAllUsers({ per_page: 100 }));
      }
      
      // Fetch tasks
      if (isEmployee) {
        promises.push(taskAPI.getMyTasks());
      } else {
        promises.push(taskAPI.getAllTasks());
      }

      const responses = await Promise.all(promises);
      
      let depts = responses[0].data || [];
      setDepartments(depts);
      
      if (!isEmployee) {
        const usersData = responses[1].data?.data || responses[1].data?.users || [];
        // For HOD, filter users to their managed departments
        if (isHOD) {
          const managedIds = getManagedDeptIds();
          const filteredUsers = usersData.filter(u => 
            managedIds.includes(Number(u.department_id)) || Number(u.department_id) === Number(user.department_id)
          );
          setAllUsers(filteredUsers);
        } else {
          setAllUsers(usersData);
        }
      }
      
      const tasksData = responses[isEmployee ? 1 : 2].data?.tasks || [];
      // For HOD, filter tasks to their managed departments
      if (isHOD) {
        const managedIds = getManagedDeptIds();
        const managedDeptNames = depts
          .filter(d => managedIds.includes(Number(d.id)) || Number(d.id) === Number(user.department_id))
          .map(d => d.name);
        const filteredTasks = tasksData.filter(t => managedDeptNames.includes(t.department));
        setAllTasks(filteredTasks);
      } else {
        setAllTasks(tasksData);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  // Generate suggestions based on search term
  const generateSuggestions = useCallback((term) => {
    if (!term || term.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    const searchLower = term.toLowerCase();
    const newSuggestions = [];

    // Search Tasks - available to all roles
    const matchingTasks = allTasks.filter(t =>
      t.title?.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower)
    ).slice(0, 5);
    
    matchingTasks.forEach(task => {
      newSuggestions.push({
        type: 'task',
        id: task.id,
        title: task.title,
        subtitle: `${task.status} • ${task.priority} priority`,
        icon: 'task',
        data: task
      });
    });

    // Search Users/Employees - available to admins and HODs
    if (!isEmployee) {
      const matchingUsers = allUsers.filter(u =>
        u.username?.toLowerCase().includes(searchLower) ||
        u.name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower)
      ).slice(0, 5);
      
      matchingUsers.forEach(usr => {
        const isUserHOD = usr.role === 'dept_admin';
        newSuggestions.push({
          type: isUserHOD ? 'hod' : 'employee',
          id: usr.id,
          title: usr.name || usr.username,
          subtitle: `${usr.email} • ${usr.department || usr.department_name || 'No department'}`,
          icon: isUserHOD ? 'hod' : 'user',
          data: usr
        });
      });
    }

    // Search Departments - available to admins only
    if (isAdmin) {
      const matchingDepts = departments.filter(d =>
        d.name?.toLowerCase().includes(searchLower) ||
        d.description?.toLowerCase().includes(searchLower)
      ).slice(0, 3);
      
      matchingDepts.forEach(dept => {
        newSuggestions.push({
          type: 'department',
          id: dept.id,
          title: dept.name,
          subtitle: dept.description || 'Department',
          icon: 'department',
          data: dept
        });
      });
    }

    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
    setLoadingSuggestions(false);
  }, [allTasks, allUsers, departments, isEmployee, isAdmin]);

  // Debounced search for suggestions
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      generateSuggestions(value);
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    setShowSuggestions(false);
    
    switch (suggestion.type) {
      case 'task':
        navigate(`/dashboard/tasks/${suggestion.id}`);
        break;
      case 'employee':
      case 'hod':
        navigate(`/dashboard/users`);
        break;
      case 'department':
        navigate(`/dashboard/departments/${suggestion.id}`);
        break;
      default:
        break;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    setLoading(true);
    setSearched(true);

    try {
      const searchLower = searchTerm.toLowerCase();
      
      // Filter tasks
      let tasks = allTasks;
      if (searchTerm) {
        tasks = tasks.filter(t => 
          t.title?.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower) ||
          t.status?.toLowerCase().includes(searchLower) ||
          t.priority?.toLowerCase().includes(searchLower) ||
          t.department?.toLowerCase().includes(searchLower) ||
          t.assignee_name?.toLowerCase().includes(searchLower)
        );
      }

      // Sort by created_at descending by default
      tasks.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      // Filter users (employees)
      let users = [];
      let hods = [];
      if (!isEmployee && (searchType === 'all' || searchType === 'users' || searchType === 'hods')) {
        const filteredUsers = allUsers.filter(u => {
          if (!searchTerm) return true;
          return u.username?.toLowerCase().includes(searchLower) ||
            u.name?.toLowerCase().includes(searchLower) ||
            u.email?.toLowerCase().includes(searchLower) ||
            u.department?.toLowerCase().includes(searchLower) ||
            u.department_name?.toLowerCase().includes(searchLower);
        });
        
        users = filteredUsers.filter(u => u.role === 'employee');
        if (isAdmin) {
          hods = filteredUsers.filter(u => u.role === 'dept_admin');
        }
      }

      // Filter departments (admin only)
      let deptResults = [];
      if (isAdmin && (searchType === 'all' || searchType === 'departments')) {
        deptResults = departments.filter(d => {
          if (!searchTerm) return true;
          return d.name?.toLowerCase().includes(searchLower) ||
            d.description?.toLowerCase().includes(searchLower);
        });
      }

      setResults({ 
        tasks: searchType === 'all' || searchType === 'tasks' ? tasks : [],
        users: searchType === 'all' || searchType === 'users' ? users : [],
        hods: searchType === 'all' || searchType === 'hods' ? hods : [],
        departments: searchType === 'all' || searchType === 'departments' ? deptResults : []
      });
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
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
      case 'urgent': return 'bg-purple-100 text-purple-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSuggestionIcon = (type) => {
    switch (type) {
      case 'task': return <ClipboardList className="w-4 h-4 text-blue-600" />;
      case 'employee': return <Users className="w-4 h-4 text-green-600" />;
      case 'hod': return <UserCog className="w-4 h-4 text-orange-600" />;
      case 'department': return <Building2 className="w-4 h-4 text-purple-600" />;
      default: return <SearchIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSearchTypeOptions = () => {
    const options = [{ value: 'all', label: 'All' }, { value: 'tasks', label: 'Tasks' }];
    
    if (isAdmin) {
      options.push({ value: 'departments', label: 'Departments' });
      options.push({ value: 'hods', label: 'HODs' });
      options.push({ value: 'users', label: 'Employees' });
    } else if (isHOD) {
      options.push({ value: 'users', label: 'Employees' });
    }
    
    return options;
  };

  const getTotalResults = () => {
    return results.tasks.length + results.users.length + results.hods.length + results.departments.length;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black">
          {isEmployee ? 'Search My Tasks' : isHOD ? 'Department Search' : 'Global Search'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEmployee 
            ? 'Search your assigned tasks' 
            : isHOD 
            ? 'Search tasks and employees in your departments'
            : 'Search across departments, HODs, employees, and tasks'
          }
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  isEmployee 
                    ? "Search your tasks..." 
                    : isHOD
                    ? "Search tasks, employees..."
                    : "Search departments, HODs, employees, tasks..."
                }
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => searchTerm.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-lg"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              
              {/* Suggestions Dropdown */}
              {showSuggestions && (
                <div 
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                >
                  {loadingSuggestions ? (
                    <div className="p-4 flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Searching...</span>
                    </div>
                  ) : (
                    <>
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-medium text-gray-500 uppercase">Suggestions</span>
                      </div>
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={`${suggestion.type}-${suggestion.id}-${idx}`}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-b-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {getSuggestionIcon(suggestion.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{suggestion.title}</div>
                            <div className="text-sm text-gray-500 truncate">{suggestion.subtitle}</div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            suggestion.type === 'task' ? 'bg-blue-100 text-blue-700' :
                            suggestion.type === 'employee' ? 'bg-green-100 text-green-700' :
                            suggestion.type === 'hod' ? 'bg-orange-100 text-orange-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {suggestion.type === 'hod' ? 'HOD' : suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
                          </span>
                        </button>
                      ))}
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Press Enter to search all results</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!isEmployee && (
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {getSearchTypeOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
              <button
                type="submit"
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Search
              </button>
            </div>
          </div>
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
            <span>Found: {getTotalResults()} results</span>
            {results.tasks.length > 0 && <span>• {results.tasks.length} tasks</span>}
            {results.users.length > 0 && <span>• {results.users.length} employees</span>}
            {results.hods.length > 0 && <span>• {results.hods.length} HODs</span>}
            {results.departments.length > 0 && <span>• {results.departments.length} departments</span>}
          </div>

          {/* Departments Results - Admin Only */}
          {isAdmin && results.departments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-black">Departments ({results.departments.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.departments.map((dept) => (
                  <div 
                    key={dept.id} 
                    onClick={() => navigate(`/dashboard/departments/${dept.id}`)}
                    className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 hover:shadow-md transition-all cursor-pointer border border-purple-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-black truncate">{dept.name}</h3>
                        <p className="text-sm text-gray-600 truncate">{dept.description || 'No description'}</p>
                        <p className="text-xs text-purple-600 mt-1">{dept.users_count || 0} members</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HODs Results - Admin Only */}
          {isAdmin && results.hods.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserCog className="w-5 h-5 text-orange-600" />
                <h2 className="text-lg font-semibold text-black">Heads of Department ({results.hods.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.hods.map((hod) => (
                  <div 
                    key={hod.id} 
                    onClick={() => navigate('/dashboard/users')}
                    className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 hover:shadow-md transition-all cursor-pointer border border-orange-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-semibold">
                          {(hod.name || hod.username)?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-black truncate">{hod.name || hod.username}</h3>
                        <p className="text-sm text-gray-600 truncate">{hod.email}</p>
                        <p className="text-xs text-orange-600 mt-1">{hod.department || hod.department_name || 'No department'}</p>
                      </div>
                      <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">HOD</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employees Results */}
          {results.users.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-black">Employees ({results.users.length})</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.users.map((usr) => (
                  <div 
                    key={usr.id} 
                    onClick={() => navigate('/dashboard/users')}
                    className="p-4 bg-green-50 rounded-lg hover:bg-green-100 hover:shadow-md transition-all cursor-pointer border border-green-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-semibold">
                          {(usr.name || usr.username)?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-black truncate">{usr.name || usr.username}</h3>
                        <p className="text-sm text-gray-600 truncate">{usr.email}</p>
                        <p className="text-xs text-green-600 mt-1">{usr.department || usr.department_name || 'No department'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Results */}
          {results.tasks.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-black">Tasks ({results.tasks.length})</h2>
              </div>
              <div className="space-y-3">
                {results.tasks.map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-blue-200"
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
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status === 'in-progress' ? 'In Progress' : task.status === 'on-hold' ? 'On Hold' : task.status?.charAt(0).toUpperCase() + task.status?.slice(1)}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority?.toUpperCase()}
                      </span>
                      {(task.department_name || task.department) && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {task.department_name || task.department}
                        </span>
                      )}
                      {task.assignee_name && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {task.assignee_name}
                        </span>
                      )}
                    </div>
                    {task.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span className="font-medium">{task.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
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

          {/* No Results */}
          {getTotalResults() === 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try different keywords or adjust your filters</p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!loading && !searched && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Start searching</h3>
          <p className="text-gray-600 mb-4">
            {isEmployee 
              ? 'Enter keywords to search your tasks'
              : isHOD
              ? 'Search for tasks and employees in your departments'
              : 'Search across departments, HODs, employees, and tasks'
            }
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {isAdmin && (
              <>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">Departments</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">HODs</span>
              </>
            )}
            {!isEmployee && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">Employees</span>
            )}
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">Tasks</span>
          </div>
        </div>
      )}
    </div>
  );
}
