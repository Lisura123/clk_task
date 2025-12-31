import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  Search,
  User,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
  Eye,
  Trash2,
  ExternalLink,
  FileText
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new notifications every 15 seconds (reduced from 30)
    const interval = setInterval(fetchUnreadCount, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      const newCount = response.data.count || 0;
      
      // Trigger animation if count increased
      if (newCount > unreadCount && unreadCount > 0) {
        setHasNewNotification(true);
        setTimeout(() => setHasNewNotification(false), 3000);
      }
      
      setUnreadCount(newCount);
    } catch (error) {
      // Silently fail - notification count is not critical
      console.debug('Failed to fetch notification count');
    }
  };

  const fetchRecentNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await api.get('/notifications?limit=5');
      const notifications = (response.data.data || []).map(n => ({
        ...n,
        read_status: n.read_status === 0 ? 'unread' : 'read'
      }));
      setRecentNotifications(notifications);
    } catch (error) {
      console.error('Failed to fetch notifications');
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleNotificationClick = () => {
    setShowNotificationDropdown(!showNotificationDropdown);
    if (!showNotificationDropdown) {
      fetchRecentNotifications();
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      fetchUnreadCount();
      fetchRecentNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read');
    }
  };

  const deleteNotification = async (notificationId, event) => {
    event.stopPropagation();
    try {
      await api.delete(`/notifications/${notificationId}`);
      fetchUnreadCount();
      fetchRecentNotifications();
    } catch (error) {
      console.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
      case 'task_completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
      case 'task_overdue':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info':
      case 'task_assigned':
      case 'task_updated':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'registration':
        return <UserCheck className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super_admin', 'dept_admin', 'employee'] },
    { name: 'Tasks', href: '/dashboard/tasks', icon: ClipboardList, roles: ['super_admin', 'dept_admin'] },
    { name: 'My Tasks', href: '/dashboard/my-tasks', icon: ClipboardList, roles: ['employee'] },
    { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['super_admin', 'dept_admin'] },
    { name: 'Create Employee', href: '/dashboard/create-employee', icon: UserPlus, roles: ['super_admin'] },
    { name: 'Pending Registrations', href: '/dashboard/pending-registrations', icon: UserCheck, roles: ['super_admin'] },
    { name: 'Departments', href: '/dashboard/departments', icon: Building2, roles: ['super_admin'] },
    { name: 'Groups', href: '/dashboard/groups', icon: Users, roles: ['super_admin', 'dept_admin'] },
    { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar, roles: ['super_admin', 'dept_admin'] },
    { name: 'Search', href: '/dashboard/search', icon: Search, roles: ['super_admin', 'dept_admin', 'employee'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              {/* Logo */}
              <div className="flex items-center gap-3 ml-4 lg:ml-0">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">CLK</span>
                </div>
                <span className="text-xl font-bold text-black hidden sm:block">CLK Task Management</span>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={handleNotificationClick}
                  className={`relative p-2.5 rounded-lg transition-all duration-300 group ${
                    unreadCount > 0 
                      ? 'bg-red-50 hover:bg-red-100 text-red-600' 
                      : 'text-gray-600 hover:bg-gray-100'
                  } ${hasNewNotification ? 'animate-pulse' : ''}`}
                  title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'No new notifications'}
                  aria-label={`Notifications - ${unreadCount} unread`}
                >
                  {/* Bell Icon with Ring Animation */}
                  <div className="relative">
                    <Bell className={`w-6 h-6 transition-all duration-300 ${
                      unreadCount > 0 
                        ? 'text-red-600 group-hover:scale-110 group-hover:rotate-12' 
                        : 'text-gray-600 group-hover:scale-110'
                    }`} />
                    
                    {/* Notification Badge */}
                    {unreadCount > 0 && (
                      <span className={`absolute -top-2 -right-2 min-w-[20px] h-[20px] bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5 shadow-lg ring-2 ring-white ${
                        hasNewNotification ? 'animate-bounce' : 'animate-pulse'
                      }`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                    
                    {/* Pulse Ring for New Notifications */}
                    {hasNewNotification && (
                      <span className="absolute -inset-1 bg-red-400 rounded-full opacity-30 animate-ping"></span>
                    )}
                    
                    {/* Active Indicator Dot */}
                    {unreadCount === 0 && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 ring-2 ring-white"></span>
                    )}
                  </div>
                  
                  {/* Tooltip on Hover */}
                  <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'No notifications'}
                  </div>
                </button>

                {/* Notification Dropdown */}
                {showNotificationDropdown && (
                  <div className="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header with Gradient */}
                    <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-red-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <Link
                        to="/dashboard/notifications"
                        className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 hover:gap-2 transition-all"
                        onClick={() => setShowNotificationDropdown(false)}
                      >
                        View All
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {loadingNotifications ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
                        </div>
                      ) : recentNotifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-900 mb-1">All caught up!</p>
                          <p className="text-xs text-gray-500">No notifications to show</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {recentNotifications.map((notification, index) => {
                            const isUrgent = notification.type === 'deadline_alert' || notification.type === 'task_overdue';
                            return (
                            <div
                              key={notification.id}
                              className={`p-4 hover:bg-gray-50 transition-all duration-200 cursor-pointer group relative ${
                                notification.read_status === 'unread' 
                                  ? isUrgent
                                    ? 'bg-red-50 border-l-4 border-red-500'
                                    : 'bg-blue-50/50 border-l-4 border-blue-500'
                                  : ''
                              }`}
                              style={{ animationDelay: `${index * 50}ms` }}
                              onClick={() => {
                                if (notification.read_status === 'unread') {
                                  markAsRead(notification.id);
                                }
                                if (notification.task_id) {
                                  navigate(`/dashboard/tasks/${notification.task_id}`);
                                  setShowNotificationDropdown(false);
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                {/* Icon with animated background */}
                                <div className={`flex-shrink-0 mt-0.5 p-2 rounded-lg transition-colors ${
                                  isUrgent 
                                    ? 'bg-red-100 group-hover:bg-red-200' 
                                    : 'bg-gray-100 group-hover:bg-gray-200'
                                }`}>
                                  {getNotificationIcon(notification.type)}
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm leading-tight ${
                                    notification.read_status === 'unread' 
                                      ? 'font-semibold text-gray-900' 
                                      : 'text-gray-700'
                                  }`}>
                                    {notification.title}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </span>
                                    {notification.read_status === 'unread' && (
                                      <span className={`flex items-center gap-1 text-xs font-medium ${
                                        isUrgent ? 'text-red-600' : 'text-blue-600'
                                      }`}>
                                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                                          isUrgent ? 'bg-red-600' : 'bg-blue-600'
                                        }`}></div>
                                        {isUrgent ? 'Urgent' : 'New'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex-shrink-0 flex items-start gap-1">
                                  {notification.read_status === 'unread' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAsRead(notification.id);
                                      }}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                      title="Mark as read"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => deleteNotification(notification.id, e)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer with Action */}
                    {recentNotifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-red-50">
                        <Link
                          to="/dashboard/notifications"
                          className="text-sm text-center block text-red-600 hover:text-red-700 font-semibold hover:gap-2 flex items-center justify-center gap-1 group transition-all"
                          onClick={() => setShowNotificationDropdown(false)}
                        >
                          View all notifications 
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User Menu */}
              <Link
                to="/dashboard/profile"
                className="flex items-center gap-3 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg p-2 transition-colors"
                title="Profile"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-black">{user?.username}</p>
                  <p className="text-xs text-gray-600">{user?.role?.replace('_', ' ')}</p>
                </div>
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-semibold text-sm">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-20 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full pt-20">
          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-red-50 text-red-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-4 border-t border-gray-200 space-y-1">
            <Link
              to="/dashboard/profile"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Link>
            <Link
              to="/dashboard/notifications"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors relative"
              onClick={fetchUnreadCount}
            >
              <div className="relative">
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-red-600' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="ml-auto bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link
              to="/dashboard/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 pt-16">
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
