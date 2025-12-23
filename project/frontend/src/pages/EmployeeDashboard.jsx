import { ClipboardList, CheckCircle, Clock, AlertCircle, TrendingUp, Calendar, Target, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskAPI, dashboardAPI } from '../services/api';
import useAuthStore from '../store/authStore';

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    highPriorityTasks: 0,
    mediumPriorityTasks: 0,
    lowPriorityTasks: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats from dashboard API
      const statsResponse = await dashboardAPI.getStats();
      const dashboardStats = statsResponse.data.data;
      
      // Fetch tasks for recent tasks display
      const tasksResponse = await taskAPI.getMyTasks();
      const tasks = tasksResponse.data.tasks || [];
      
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcoming = tasks.filter(t => {
        const dueDate = new Date(t.due_date);
        return dueDate >= now && dueDate <= nextWeek && t.status !== 'completed';
      });

      console.log('Employee Dashboard Stats:', dashboardStats);
      
      setStats({
        totalTasks: dashboardStats.totalTasks || 0,
        completedTasks: dashboardStats.completed || 0,
        inProgressTasks: dashboardStats.inProgress || 0,
        pendingTasks: dashboardStats.todo || 0,
        overdueTasks: dashboardStats.overdue || 0,
        completionRate: dashboardStats.completionRate || 0,
        highPriorityTasks: (dashboardStats.priority?.high || 0) + (dashboardStats.priority?.urgent || 0),
        mediumPriorityTasks: dashboardStats.priority?.medium || 0,
        lowPriorityTasks: dashboardStats.priority?.low || 0
      });

      setRecentTasks(dashboardStats.recentTasks || tasks.slice(0, 5));
      setUpcomingDeadlines(upcoming.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
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
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{getGreeting()}, {user?.username}!</h1>
        <p className="text-red-100 text-lg">Here's your task overview for today.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Total Tasks</h3>
          <p className="text-3xl font-bold text-black mt-1">{stats.totalTasks}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Completed</h3>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.completedTasks}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">In Progress</h3>
          <p className="text-3xl font-bold text-blue-600 mt-1">{stats.inProgressTasks}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-gray-600 text-sm font-medium">Overdue</h3>
          <p className="text-3xl font-bold text-red-600 mt-1">{stats.overdueTasks}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => navigate('/dashboard/my-tasks')}
          className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-red-600 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg group-hover:bg-red-600 transition-colors">
              <ClipboardList className="w-6 h-6 text-red-600 group-hover:text-white transition-colors" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-black">View All Tasks</h3>
              <p className="text-sm text-gray-600">Manage your assigned tasks</p>
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
        </button>

        <button
          onClick={() => navigate('/dashboard/notifications')}
          className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-red-600 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-600 transition-colors">
              <Activity className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-black">View Notifications</h3>
              <p className="text-sm text-gray-600">Check your updates</p>
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
        </button>
      </div>

      {/* Charts and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Task Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-red-600" />
            Task Status Distribution
          </h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-sm font-medium text-black">{stats.completedTasks} ({stats.completionRate}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.completionRate}%` }}></div>
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
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Priority Distribution
          </h2>
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
      </div>

      {/* Recent Tasks and Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-600" />
            Recent Tasks (Last 5)
          </h2>
          <div className="space-y-3">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-medium text-black line-clamp-1">{task.title}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No tasks yet</p>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-600" />
            Upcoming Deadlines (Next 7 Days)
          </h2>
          <div className="space-y-3">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/dashboard/tasks/${task.id}`)}
                  className="p-3 bg-yellow-50 rounded-lg border-l-2 border-yellow-600 hover:bg-yellow-100 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-medium text-black line-clamp-1">{task.title}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No upcoming deadlines</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
