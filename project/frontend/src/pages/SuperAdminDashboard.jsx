import { Users, Building2, ClipboardList, TrendingUp, AlertCircle, CheckCircle, Clock, AlertTriangle, UserCheck, Activity, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { departmentAPI, taskAPI, userAPI, dashboardAPI } from '../services/api';
import useAuthStore from '../store/authStore';

export default function SuperAdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    deptAdmins: 0,
    inactiveUsers: 0,
    totalDepartments: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    highPriorityTasks: 0,
    mediumPriorityTasks: 0,
    lowPriorityTasks: 0,
    completionRate: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [criticalTasks, setCriticalTasks] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch comprehensive dashboard data from backend
      const dashboardRes = await dashboardAPI.getSuperAdminData();
      const raw = dashboardRes.data;
      const dashboardData = raw?.data || raw || {};
      const dashboardStats = dashboardData?.stats || dashboardData?.statistics || dashboardData || {};
      
      // Fetch all tasks for critical/upcoming calculations
      const tasksRes = await taskAPI.getAllTasks();
      const tasks = tasksRes.data.tasks || [];
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const overdue = tasks.filter(t => new Date(t.due_date) < now && t.status !== 'completed');
      const upcoming = tasks.filter(t => {
        const dueDate = new Date(t.due_date);
        return dueDate >= now && dueDate <= nextWeek && t.status !== 'completed';
      });

      console.log('Super Admin Dashboard Stats:', dashboardStats);
      
      setStats({
        totalUsers: dashboardStats.users?.total || 0,
        activeUsers: dashboardStats.users?.active || 0,
        deptAdmins: dashboardStats.users?.departmentAdmins || 0,
        inactiveUsers: (dashboardStats.users?.total || 0) - (dashboardStats.users?.active || 0),
        totalDepartments: dashboardStats.totalDepartments || 0,
        totalTasks: dashboardStats.totalTasks || 0,
        completedTasks: dashboardStats.completed || 0,
        inProgressTasks: dashboardStats.inProgress || 0,
        pendingTasks: dashboardStats.todo || 0,
        overdueTasks: dashboardStats.overdue || 0,
        highPriorityTasks: (dashboardStats.priority?.high || 0) + (dashboardStats.priority?.urgent || 0),
        mediumPriorityTasks: dashboardStats.priority?.medium || 0,
        lowPriorityTasks: dashboardStats.priority?.low || 0,
        completionRate: dashboardStats.completionRate || 0,
      });

      setRecentTasks(dashboardData.tasks || tasks.slice(0, 10));
      setCriticalTasks(overdue.slice(0, 5));
      setUpcomingDeadlines(upcoming.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickStats = [
    { name: 'Total Tasks', value: stats.totalTasks, icon: ClipboardList, color: 'from-blue-500 to-blue-600', textColor: 'text-blue-600' },
    { name: 'Active Projects', value: stats.inProgressTasks, icon: Activity, color: 'from-purple-500 to-purple-600', textColor: 'text-purple-600' },
    { name: 'Employees', value: stats.totalUsers, icon: Users, color: 'from-green-500 to-green-600', textColor: 'text-green-600' },
    { name: 'Completion Rate', value: `${stats.completionRate}%`, icon: Target, color: 'from-red-500 to-red-600', textColor: 'text-red-600' },
  ];

  const mainStats = [
    { name: 'Total Tasks', value: stats.totalTasks, icon: ClipboardList, color: 'bg-blue-500' },
    { name: 'Completed', value: stats.completedTasks, icon: CheckCircle, color: 'bg-green-500' },
    { name: 'In Progress', value: stats.inProgressTasks, icon: Clock, color: 'bg-blue-400' },
    { name: 'Pending', value: stats.pendingTasks, icon: AlertCircle, color: 'bg-yellow-500' },
    { name: 'Overdue', value: stats.overdueTasks, icon: AlertTriangle, color: 'bg-red-600' },
    { name: 'High Priority', value: stats.highPriorityTasks, icon: AlertTriangle, color: 'bg-orange-500' },
    { name: 'Medium Priority', value: stats.mediumPriorityTasks, icon: TrendingUp, color: 'bg-yellow-400' },
    { name: 'Low Priority', value: stats.lowPriorityTasks, icon: TrendingUp, color: 'bg-green-400' },
  ];

  const adminStats = [
    { name: 'Total Departments', value: stats.totalDepartments, icon: Building2, color: 'bg-indigo-500' },
    { name: 'Department Admins', value: stats.deptAdmins, icon: UserCheck, color: 'bg-purple-500' },
    { name: 'Total Employees', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { name: 'Active Users', value: stats.activeUsers, icon: Users, color: 'bg-green-500' },
  ];

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-8 bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-8 text-white">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back, {user?.username}!</h1>
        <p className="text-red-100 text-lg">Here's what's happening with your organization today.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-bl-full`}></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <Icon className={`w-8 h-8 ${stat.textColor}`} />
                </div>
                <h3 className="text-gray-600 text-sm font-medium mb-1">{stat.name}</h3>
                <p className="text-3xl font-bold text-black">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-black mb-4">Task Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {mainStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className={`${stat.color} p-2 rounded-lg inline-block mb-3`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-gray-600 text-xs font-medium">{stat.name}</h3>
                <p className="text-2xl font-bold text-black mt-1">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin-Only Stats */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-black mb-4">Organization Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className={`${stat.color} p-3 rounded-lg inline-block mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-gray-600 text-sm font-medium">{stat.name}</h3>
                <p className="text-3xl font-bold text-black mt-1">{stat.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Task Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-black mb-4">Task Status Distribution</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-sm font-medium text-black">{stats.completedTasks} ({stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">In Progress</span>
                <span className="text-sm font-medium text-black">{stats.inProgressTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.totalTasks > 0 ? (stats.inProgressTasks / stats.totalTasks) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="text-sm font-medium text-black">{stats.pendingTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${stats.totalTasks > 0 ? (stats.pendingTasks / stats.totalTasks) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Overdue</span>
                <span className="text-sm font-medium text-red-600">{stats.overdueTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-600 h-2 rounded-full" style={{ width: `${stats.totalTasks > 0 ? (stats.overdueTasks / stats.totalTasks) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-black mb-4">Priority Distribution</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">High/Urgent</span>
                <span className="text-sm font-medium text-black">{stats.highPriorityTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${stats.totalTasks > 0 ? (stats.highPriorityTasks / stats.totalTasks) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Medium</span>
                <span className="text-sm font-medium text-black">{stats.mediumPriorityTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${stats.totalTasks > 0 ? (stats.mediumPriorityTasks / stats.totalTasks) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Low</span>
                <span className="text-sm font-medium text-black">{stats.lowPriorityTasks}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.totalTasks > 0 ? (stats.lowPriorityTasks / stats.totalTasks) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Tasks */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-black mb-4">Critical Tasks</h2>
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-red-600">Overdue ({stats.overdueTasks})</h3>
            {criticalTasks.length > 0 ? (
              criticalTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="p-2 bg-red-50 rounded border-l-2 border-red-600">
                  <p className="text-xs font-medium text-black line-clamp-1">{task.title}</p>
                  <p className="text-xs text-gray-600">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No overdue tasks</p>
            )}
            <h3 className="text-sm font-medium text-yellow-600 mt-4">Upcoming (7 days)</h3>
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.slice(0, 2).map((task) => (
                <div key={task.id} className="p-2 bg-yellow-50 rounded border-l-2 border-yellow-600">
                  <p className="text-xs font-medium text-black line-clamp-1">{task.title}</p>
                  <p className="text-xs text-gray-600">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No upcoming deadlines</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-black mb-4">Recent Tasks (Last 10)</h2>
        <div className="space-y-3">
          {recentTasks.length > 0 ? (
            recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <p className="text-sm font-medium text-black">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="text-xs text-gray-500">{task.department_name}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No tasks yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
