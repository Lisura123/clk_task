import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Building2,
  ClipboardList,
  ClipboardCheck,
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
  FileText,
  CalendarDays,
  Palmtree,
  ChevronLeft,
  ChevronRight,
  Home,
  Briefcase,
  Clock,
  MapPin,
  Wallet
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import browserNotificationService from '../services/browserNotificationService';
import NotificationPermission from '../components/NotificationPermission';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import OnboardingTour from '../components/OnboardingTour';

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [hasGpsAttendanceAccess, setHasGpsAttendanceAccess] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const dropdownRef = useRef(null);
  const lastNotificationIdRef = useRef(null);

  // Check if onboarding should be shown
  useEffect(() => {
    if (user && !user.onboarding_completed) {
      // Check localStorage as fallback
      const localOnboardingComplete = localStorage.getItem('onboarding_completed');
      if (localOnboardingComplete !== 'true') {
        // Small delay to let the page render first
        const timer = setTimeout(() => setShowOnboarding(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save sidebar collapsed state
  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  // Initialize browser notification service
  useEffect(() => {
    browserNotificationService.initialize();
  }, []);

  // Check GPS attendance access
  useEffect(() => {
    const checkGpsAccess = async () => {
      try {
        console.log('Checking GPS access for user:', user?.id, user?.name);
        const response = await api.get('/gps-attendance/access');
        console.log('GPS Access API Response:', response.data);
        // User has GPS attendance access if API returns has_access: true
        // This includes branch_employee users and anyone with attendance role
        const hasAccess = response.data?.has_access === true;
        console.log('Setting hasGpsAttendanceAccess to:', hasAccess);
        setHasGpsAttendanceAccess(hasAccess);
      } catch (err) {
        console.error('GPS Access Check Error:', err.response?.data || err.message || err);
        setHasGpsAttendanceAccess(false);
      }
    };
    
    if (user) {
      checkGpsAccess();
    }
  }, [user]);

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
    
    // Poll for new notifications every 15 seconds
    const interval = setInterval(fetchUnreadCount, 15000);
    
    // Also check when tab becomes visible again (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      const newCount = response.data.count || 0;
      
      // Trigger animation if count increased
      if (newCount > unreadCount && unreadCount > 0) {
        setHasNewNotification(true);
        setTimeout(() => setHasNewNotification(false), 3000);
        
        // Fetch the latest unread notification for browser push
        checkForNewNotifications();
      }
      
      // Also check for new notifications if tab is hidden (background)
      // This ensures browser notifications appear even when user is on another tab
      if (document.visibilityState === 'hidden' && newCount > 0) {
        checkForNewNotifications();
      }
      
      setUnreadCount(newCount);
    } catch (error) {
      // Silently fail - notification count is not critical
      console.debug('Failed to fetch notification count');
    }
  };

  // Check for new notifications and show browser push
  const checkForNewNotifications = async () => {
    try {
      const response = await api.get('/notifications?limit=1&unread=1');
      const notifications = response.data.data || [];
      
      if (notifications.length > 0) {
        const latestNotification = notifications[0];
        
        // Only show browser notification if it's a new one
        if (lastNotificationIdRef.current !== latestNotification.id) {
          lastNotificationIdRef.current = latestNotification.id;
          
          // Show browser push notification
          if (browserNotificationService.isEnabled()) {
            browserNotificationService.showNotification(
              latestNotification.title || 'New Notification',
              {
                body: latestNotification.message || '',
                tag: `notification-${latestNotification.id}`,
                data: {
                  task_id: latestNotification.task_id,
                  notification_id: latestNotification.id,
                  url: latestNotification.task_id ? `/dashboard/tasks/${latestNotification.task_id}` : '/dashboard/notifications'
                }
              }
            );
          }
        }
      }
    } catch (error) {
      console.debug('Failed to check for new notifications');
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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'main', tourId: 'dashboard' },
    { name: 'Tasks', href: '/dashboard/tasks', icon: ClipboardList, roles: ['admin', 'hod', 'senior_employee'], category: 'work', tourId: 'tasks' },
    { name: 'My Tasks', href: '/dashboard/my-tasks', icon: ClipboardList, roles: ['employee'], category: 'work', tourId: 'my-tasks' },
    { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'work', tourId: 'schedule' },
    { name: 'Groups', href: '/dashboard/groups', icon: UsersRound, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'work', tourId: 'groups' },
    { name: 'Attendance', href: '/dashboard/attendance', icon: Clock, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'attendance', tourId: 'attendance' },
    { name: 'GPS Attendance', href: '/dashboard/gps-attendance', icon: MapPin, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'attendance', gpsAttendanceOnly: true, tourId: 'gps-attendance' },
    { name: 'Attendance Reports', href: '/dashboard/attendance-reports', icon: FileText, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'attendance', adminOrHROnly: true, tourId: 'attendance-reports' },
    { name: 'Attendance Admin', href: '/dashboard/attendance-admin', icon: Settings, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'attendance', adminOrHROnly: true, tourId: 'attendance-admin' },
    { name: 'Attendance Requests', href: '/dashboard/attendance-requests', icon: ClipboardCheck, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'attendance', tourId: 'attendance-requests' },
    { name: 'Showroom Management', href: '/dashboard/branches', icon: Building2, roles: ['admin'], category: 'attendance', tourId: 'branches' },
    { name: 'My Leaves', href: '/dashboard/my-leaves', icon: Palmtree, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'leave', tourId: 'my-leaves' },
    { name: 'Leave Approval', href: '/dashboard/leave-approval', icon: CalendarDays, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'leave', adminOrHROnly: true, tourId: 'leaves' },
    { name: 'Leave Balances', href: '/dashboard/leave-balances', icon: Wallet, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'leave', adminOrHROnly: true, tourId: 'leave-balances' },
    { name: 'Leave Settings', href: '/dashboard/leave-settings', icon: Settings, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'leave', adminOrHROnly: true, tourId: 'leave-settings' },
    { name: 'Users', href: '/dashboard/users', icon: Users, roles: ['admin', 'hod'], category: 'admin', tourId: 'users' },
    { name: 'Employees', href: '/dashboard/all-employees', icon: Users, roles: ['senior_employee', 'employee'], category: 'work', hrOnly: true, tourId: 'employees' },
    { name: 'Create Employee', href: '/dashboard/create-employee', icon: UserPlus, roles: ['admin', 'hod'], category: 'admin', tourId: 'create-employee' },
    { name: 'Pending Registrations', href: '/dashboard/pending-registrations', icon: UserCheck, roles: ['admin', 'hod'], category: 'admin', tourId: 'pending-registrations' },
    { name: 'Departments', href: '/dashboard/departments', icon: Building2, roles: ['admin'], category: 'admin', tourId: 'departments' },
    { name: 'Search', href: '/dashboard/search', icon: Search, roles: ['admin', 'hod', 'senior_employee', 'employee'], category: 'main' },
  ];

  const categoryLabels = {
    main: 'Main',
    work: 'Work',
    attendance: 'Attendance',
    leave: 'Leave',
    admin: 'Administration'
  };

  // Check if user is from HR department (ID 12)
  const isHRUser = (user?.department_name?.toLowerCase() === 'hr') || 
                   (user?.department?.toLowerCase() === 'hr') ||
                   (user?.department_id == 12) ||  // HR department ID
                   (user?.departmentRelation?.name?.toLowerCase() === 'hr');

  // Check if user is admin
  const isAdminUser = user?.role === 'admin';

  const filteredNavigation = navigation.filter(item => {
    // Check role first
    if (!item.roles.includes(user?.role)) return false;
    
    // If item is admin or HR only, check if user is admin OR from HR
    if (item.adminOrHROnly && !isAdminUser && !isHRUser) return false;
    
    // If item is HR-only, check if user is from HR
    if (item.hrOnly && !isHRUser) return false;
    
    // If item is GPS attendance only, check if user has GPS attendance access
    if (item.gpsAttendanceOnly && !hasGpsAttendanceAccess) return false;
    
    return true;
  });

  // Group navigation by category
  const groupedNavigation = filteredNavigation.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  // Mobile bottom navigation items (max 5)
  const mobileNavItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    ...(['employee', 'senior_employee'].includes(user?.role)
      ? [{ name: 'My Tasks', href: '/dashboard/my-tasks', icon: ClipboardList }]
      : [{ name: 'Tasks', href: '/dashboard/tasks', icon: ClipboardList }]),
    { name: 'Leaves', href: '/dashboard/my-leaves', icon: Palmtree },
    { name: 'Search', href: '/dashboard/search', icon: Search },
  ];

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
                  <>
                    {/* Mobile Backdrop */}
                    <div 
                      className="fixed inset-0 bg-black/40 z-40 sm:hidden"
                      onClick={() => setShowNotificationDropdown(false)}
                    />
                    
                    {/* Dropdown Container - Full screen on mobile, positioned on desktop */}
                    <div className="fixed inset-x-0 bottom-0 top-auto sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-3 sm:w-96 bg-white sm:rounded-xl rounded-t-2xl shadow-2xl border-0 sm:border border-gray-200 overflow-hidden z-50 max-h-[85vh] sm:max-h-[80vh] flex flex-col"
                      style={{ 
                        WebkitOverflowScrolling: 'touch',
                        animation: 'slideUp 0.25s ease-out'
                      }}
                    >
                      {/* Drag Handle for Mobile */}
                      <div className="flex justify-center py-2 sm:hidden bg-gray-50 border-b border-gray-100">
                        <div 
                          className="w-10 h-1 bg-gray-300 rounded-full cursor-pointer"
                          onClick={() => setShowNotificationDropdown(false)}
                        />
                      </div>
                      
                      {/* Header with Gradient */}
                      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-red-600" />
                          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Link
                            to="/dashboard/notifications"
                            className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 hover:gap-2 transition-all"
                            onClick={() => setShowNotificationDropdown(false)}
                          >
                            <span className="hidden sm:inline">View All</span>
                            <span className="sm:hidden">All</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          {/* Close Button for Mobile */}
                          <button 
                            className="sm:hidden p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => setShowNotificationDropdown(false)}
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Notification List - Scrollable */}
                      <div 
                        className="flex-1 overflow-y-auto overscroll-contain"
                        style={{ WebkitOverflowScrolling: 'touch' }}
                      >
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
                                className={`p-3 sm:p-4 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 cursor-pointer group relative ${
                                  notification.read_status === 'unread' 
                                    ? isUrgent
                                      ? 'bg-red-50 border-l-4 border-red-500'
                                      : 'bg-blue-50/50 border-l-4 border-blue-500'
                                    : ''
                                }`}
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
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                                  
                                  {/* Action Buttons - Always visible on mobile, hover on desktop */}
                                  <div className="flex-shrink-0 flex items-start gap-1">
                                    {notification.read_status === 'unread' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAsRead(notification.id);
                                        }}
                                        className="p-2 sm:p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                                        title="Mark as read"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => deleteNotification(notification.id, e)}
                                      className="p-2 sm:p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all"
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
                        <div className="px-4 py-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-red-50 flex-shrink-0 safe-area-bottom">
                          <Link
                            to="/dashboard/notifications"
                            className="text-sm text-center block text-red-600 hover:text-red-700 font-semibold hover:gap-2 flex items-center justify-center gap-1 group transition-all py-1"
                            onClick={() => setShowNotificationDropdown(false)}
                          >
                            View all notifications 
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                          </Link>
                        </div>
                      )}
                    </div>
                    
                    {/* CSS for slide-up animation */}
                    <style>{`
                      @keyframes slideUp {
                        from {
                          transform: translateY(100%);
                          opacity: 0;
                        }
                        to {
                          transform: translateY(0);
                          opacity: 1;
                        }
                      }
                      @media (min-width: 640px) {
                        @keyframes slideUp {
                          from {
                            transform: translateY(-10px);
                            opacity: 0;
                          }
                          to {
                            transform: translateY(0);
                            opacity: 1;
                          }
                        }
                      }
                      .safe-area-bottom {
                        padding-bottom: max(12px, env(safe-area-inset-bottom));
                      }
                    `}</style>
                  </>
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
                  <p className="text-xs text-gray-600">{user?.role === 'admin' ? 'Admin' : user?.role === 'hod' ? 'HOD' : user?.role === 'senior_employee' ? 'Senior' : 'Employee'}</p>
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
      <div 
        className={`fixed top-0 bottom-16 lg:bottom-0 left-0 z-20 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} w-72`}
      >
        <div className="flex flex-col h-full pt-16">
          {/* Collapse Toggle Button - Desktop Only */}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hover:shadow-md hover:bg-gray-50 transition-all z-30"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            ) : (
              <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
            )}
          </button>

          {/* User Profile Card - Mobile & Expanded Desktop */}
          <div className={`flex-shrink-0 px-4 py-4 border-b border-gray-100 ${sidebarCollapsed ? 'lg:px-3 lg:py-3' : ''}`}>
            <Link
              to="/dashboard/profile"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all group ${
                sidebarCollapsed ? 'lg:justify-center lg:p-2' : ''
              }`}
            >
              <div className={`relative flex-shrink-0 ${sidebarCollapsed ? 'lg:mx-auto' : ''}`}>
                <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <span className="text-white font-bold text-lg">
                    {user?.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
              </div>
              <div className={`flex-1 min-w-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.username}</p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.role === 'admin' ? 'Super Admin' : user?.role === 'hod' ? 'Department Admin' : user?.role === 'senior_employee' ? 'Senior Employee' : 'Employee'}
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className={`flex-1 overflow-y-auto py-4 ${sidebarCollapsed ? 'lg:px-2' : 'px-3'}`}>
            {Object.entries(groupedNavigation).map(([category, items], categoryIndex) => (
              <div key={category} className={categoryIndex > 0 ? 'mt-6' : ''}>
                {/* Category Label */}
                <div className={`px-3 mb-2 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {categoryLabels[category]}
                  </span>
                </div>
                {sidebarCollapsed && categoryIndex > 0 && (
                  <div className="hidden lg:block mx-3 my-3 border-t border-gray-100"></div>
                )}
                
                {/* Navigation Items */}
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        data-tour={item.tourId}
                        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                          sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
                        } ${
                          isActive
                            ? 'bg-red-50 text-red-600'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        title={sidebarCollapsed ? item.name : ''}
                      >
                        {/* Active Indicator */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-red-600 rounded-r-full"></span>
                        )}
                        
                        <div className={`flex-shrink-0 ${isActive ? 'text-red-600' : 'text-gray-500 group-hover:text-gray-700'}`}>
                          <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                        </div>
                        
                        <span className={`text-sm font-medium whitespace-nowrap ${sidebarCollapsed ? 'lg:hidden' : ''} ${
                          isActive ? 'text-red-600' : ''
                        }`}>
                          {item.name}
                        </span>

                        {/* Tooltip for collapsed state */}
                        {sidebarCollapsed && (
                          <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                            {item.name}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom Section - Always visible */}
          <div className={`flex-shrink-0 border-t border-gray-100 py-3 ${sidebarCollapsed ? 'lg:px-2' : 'px-3'}`}>
            {/* Quick Actions */}
            <div className="space-y-1">
              <Link
                to="/dashboard/notifications"
                onClick={() => setSidebarOpen(false)}
                data-tour="notifications"
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all ${
                  sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
                } ${location.pathname === '/dashboard/notifications' ? 'bg-red-50 text-red-600' : ''}`}
                title={sidebarCollapsed ? 'Notifications' : ''}
              >
                <div className="relative flex-shrink-0">
                  <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-red-500' : ''}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-medium ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  Notifications
                </span>
                {!sidebarCollapsed && unreadCount > 0 && (
                  <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
                
                {/* Tooltip */}
                {sidebarCollapsed && (
                  <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                    Notifications {unreadCount > 0 && `(${unreadCount})`}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </Link>
              
              <Link
                to="/dashboard/settings"
                onClick={() => setSidebarOpen(false)}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all ${
                  sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
                } ${location.pathname === '/dashboard/settings' ? 'bg-red-50 text-red-600' : ''}`}
                title={sidebarCollapsed ? 'Settings' : ''}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span className={`text-sm font-medium ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Settings</span>
                
                {/* Tooltip */}
                {sidebarCollapsed && (
                  <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                    Settings
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </Link>
              
              <button
                onClick={handleLogout}
                className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all ${
                  sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
                }`}
                title={sidebarCollapsed ? 'Logout' : ''}
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className={`text-sm font-medium ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Logout</span>
                
                {/* Tooltip */}
                {sidebarCollapsed && (
                  <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                    Logout
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'} pt-16 pb-20 lg:pb-0`}>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full relative transition-all ${
                  isActive ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-red-600 rounded-b-full"></span>
                )}
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-red-600' : 'text-gray-500'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
          
          {/* More Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-500"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">More</span>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Browser Notification Permission Prompt */}
      <NotificationPermission />

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Onboarding Tour */}
      {showOnboarding && (
        <OnboardingTour onComplete={handleOnboardingComplete} />
      )}

      {/* Global Styles */}
      <style>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .safe-area-bottom {
            padding-bottom: calc(env(safe-area-inset-bottom) + 0px);
          }
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .pb-safe {
            padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
          }
        }
        @media (max-width: 1023px) {
          .pb-safe {
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
          }
        }
      `}</style>
    </div>
  );
}
