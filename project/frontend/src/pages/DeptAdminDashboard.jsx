import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Building2,
  Calendar,
  BarChart3,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import useAuthStore from '../store/authStore';
import api, { dashboardAPI } from '../services/api';

export default function DeptAdminDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState('all');
  const [managedDepts, setManagedDepts] = useState([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    activeProjects: 0,
    teamMembers: 0,
    completionRate: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0
  });
  const [deptStats, setDeptStats] = useState([]);
  const [criticalTasks, setCriticalTasks] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDept]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats from backend
      const dashboardRes = await dashboardAPI.getStats();
      const dashboardStats = dashboardRes.data.data;
      
      console.log('Dashboard Stats from API:', dashboardStats);
      
      // Extract managed departments from stats
      const depts = dashboardStats.departmentStats ? 
        dashboardStats.departmentStats.map(d => ({ id: d.id, name: d.department })) :
        (user?.department_id ? [{ id: user.department_id, name: user.department_name || 'My Department' }] : []);
      setManagedDepts(depts);

      // Fetch tasks - the backend automatically filters by department for dept admins
      const tasksRes = await api.get('/tasks');
      const tasks = tasksRes.data.tasks || [];

      const statsData = {
        totalTasks: dashboardStats.totalTasks || 0,
        activeProjects: dashboardStats.inProgress || 0,
        teamMembers: dashboardStats.totalEmployees || 0,
        completionRate: dashboardStats.completionRate || 0,
        completedTasks: dashboardStats.completed || 0,
        inProgressTasks: dashboardStats.inProgress || 0,
        pendingTasks: dashboardStats.todo || 0,
        overdueTasks: dashboardStats.overdue || 0,
        highPriority: (dashboardStats.priority?.high || 0) + (dashboardStats.priority?.urgent || 0),
        mediumPriority: dashboardStats.priority?.medium || 0,
        lowPriority: dashboardStats.priority?.low || 0
      };
      
      console.log('Setting stats:', statsData);
      setStats(statsData);

      // Get critical tasks from dashboard stats or calculate from tasks
      const critical = dashboardStats.criticalTasks || tasks.filter(t => {
        if (t.status === 'completed') return false;
        const dueDate = new Date(t.due_date);
        const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        return dueDate < sevenDaysFromNow;
      }).slice(0, 5);
      setCriticalTasks(critical);

      // Use recent activity from dashboard stats or fall back to recent tasks
      const recent = dashboardStats.recentActivity && dashboardStats.recentActivity.length > 0 ?
        dashboardStats.recentActivity.map(activity => ({
          id: activity.taskId,
          title: activity.taskTitle || activity.title,
          status: activity.status || 'in-progress',
          priority: activity.priority || 'medium',
          assignee_name: activity.userName || activity.assigneeName
        })) :
        tasks.slice(0, 10);
      setRecentTasks(recent);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          {getTimeOfDay()}, {user?.full_name || user?.username}!
        </h1>
        <p className="text-red-100 mb-4">
          You manage {managedDepts.length} department{managedDepts.length !== 1 ? 's' : ''}: {managedDepts.map(d => d.name).join(', ')}
        </p>
        
        {/* Quick Stats Chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-red-100 text-sm">Completion Rate</p>
            <p className="text-2xl font-bold">{stats.completionRate}%</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-red-100 text-sm">Team Size</p>
            <p className="text-2xl font-bold">{stats.teamMembers}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-red-100 text-sm">In Progress</p>
            <p className="text-2xl font-bold">{stats.inProgressTasks}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-red-100 text-sm">Overdue</p>
            <p className="text-2xl font-bold">{stats.overdueTasks}</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalTasks}</p>
            </div>
            <ClipboardList className="w-12 h-12 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Projects</p>
              <p className="text-3xl font-bold text-blue-600">{stats.activeProjects}</p>
            </div>
            <BarChart3 className="w-12 h-12 text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Team Members</p>
              <p className="text-3xl font-bold text-purple-600">{stats.teamMembers}</p>
            </div>
            <Users className="w-12 h-12 text-purple-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-green-600">{stats.completionRate}%</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-400" />
          </div>
        </div>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.completedTasks}</span>
          </div>
          <p className="text-sm text-gray-600">Completed</p>
          <div className="mt-2 bg-green-100 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.inProgressTasks}</span>
          </div>
          <p className="text-sm text-gray-600">In Progress</p>
          <div className="mt-2 bg-blue-100 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full" 
              style={{ width: `${stats.totalTasks > 0 ? (stats.inProgressTasks / stats.totalTasks) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</span>
          </div>
          <p className="text-sm text-gray-600">Pending</p>
          <div className="mt-2 bg-yellow-100 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full" 
              style={{ width: `${stats.totalTasks > 0 ? (stats.pendingTasks / stats.totalTasks) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <span className="text-2xl font-bold text-gray-900">{stats.overdueTasks}</span>
          </div>
          <p className="text-sm text-gray-600">Overdue</p>
          <div className="mt-2 bg-red-100 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full" 
              style={{ width: `${stats.totalTasks > 0 ? (stats.overdueTasks / stats.totalTasks) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">High Priority</span>
                <span className="text-sm font-medium text-gray-900">{stats.highPriority}</span>
              </div>
              <div className="bg-red-100 rounded-full h-3">
                <div 
                  className="bg-red-500 h-3 rounded-full" 
                  style={{ width: `${stats.totalTasks > 0 ? (stats.highPriority / stats.totalTasks) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Medium Priority</span>
                <span className="text-sm font-medium text-gray-900">{stats.mediumPriority}</span>
              </div>
              <div className="bg-orange-100 rounded-full h-3">
                <div 
                  className="bg-orange-500 h-3 rounded-full" 
                  style={{ width: `${stats.totalTasks > 0 ? (stats.mediumPriority / stats.totalTasks) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Low Priority</span>
                <span className="text-sm font-medium text-gray-900">{stats.lowPriority}</span>
              </div>
              <div className="bg-green-100 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full" 
                  style={{ width: `${stats.totalTasks > 0 ? (stats.lowPriority / stats.totalTasks) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">Departments Managed</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{managedDepts.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">Total Team Members</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{stats.teamMembers}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">Avg Tasks per Person</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {stats.teamMembers > 0 ? Math.round(stats.totalTasks / stats.teamMembers) : 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Tasks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Critical Tasks
          </h3>
          {criticalTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No critical tasks</p>
          ) : (
            <div className="space-y-3">
              {criticalTasks.map(task => (
                <div key={task.id} className="p-3 border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                  <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(task.status)}`}>
                      {task.status?.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent tasks</p>
          ) : (
            <div className="space-y-3">
              {recentTasks.slice(0, 5).map(task => (
                <div key={task.id} className="p-3 border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                  <h4 className="font-medium text-gray-900 mb-2 line-clamp-1">{task.title}</h4>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(task.status)}`}>
                      {task.status?.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                      {task.priority?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {task.assignee_name || 'Unassigned'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
