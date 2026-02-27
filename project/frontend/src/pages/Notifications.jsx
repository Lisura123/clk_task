import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, CheckCheck, Trash, Filter, AlertCircle, CheckCircle, Info, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const Notifications = () => {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    search: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    read: 0,
    urgent: 0,
    task: 0,
    system: 0,
    user: 0
  });

  useEffect(() => {
    fetchNotifications();
    
    // Auto-refresh notifications every 15 seconds
    const interval = setInterval(() => {
      fetchNotifications(true); // true = silent refresh
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [notifications, filters]);

  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const response = await api.get('/notifications');
      console.log('Notifications API response:', response.data);
      const notifs = response.data.data || [];  // Changed from response.data.notifications
      setNotifications(notifs);
      
      // Calculate stats
      const stats = {
        total: notifs.length,
        unread: notifs.filter(n => n.read_status === 0 || n.read_status === false || !n.read_status).length,
        read: notifs.filter(n => n.read_status === 1 || n.read_status === true).length,
        urgent: notifs.filter(n => n.type === 'deadline_alert' || n.type === 'task_overdue').length,
        task: notifs.filter(n => n.type === 'task_assigned' || n.type === 'task_updated' || n.type === 'task_completed' || n.type === 'comment_added').length,
        system: notifs.filter(n => n.type === 'new_registration' || n.type === 'registration_approved' || n.type === 'registration_rejected').length,
        user: notifs.filter(n => n.type === 'user_activated' || n.type === 'user_deactivated' || n.type === 'password_changed').length
      };
      setStats(stats);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const handleManualRefresh = () => {
    fetchNotifications(false);
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Filter by type
    if (filters.type !== 'all') {
      if (filters.type === 'urgent') {
        filtered = filtered.filter(n => 
          n.type === 'deadline_alert' || 
          n.type === 'task_overdue'
        );
      } else if (filters.type === 'task') {
        filtered = filtered.filter(n => 
          n.type === 'task_assigned' || 
          n.type === 'task_updated' || 
          n.type === 'task_completed' || 
          n.type === 'comment_added'
        );
      } else if (filters.type === 'system') {
        filtered = filtered.filter(n => 
          n.type === 'new_registration' || 
          n.type === 'registration_approved' || 
          n.type === 'registration_rejected'
        );
      } else if (filters.type === 'user') {
        filtered = filtered.filter(n => 
          n.type === 'user_activated' || 
          n.type === 'user_deactivated' || 
          n.type === 'password_changed'
        );
      }
    }

    // Filter by status
    if (filters.status === 'unread') {
      filtered = filtered.filter(n => n.read_status === 0 || n.read_status === false || !n.read_status);
    } else if (filters.status === 'read') {
      filtered = filtered.filter(n => n.read_status === 1 || n.read_status === true);
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(n => 
        n.message?.toLowerCase().includes(searchLower) ||
        n.title?.toLowerCase().includes(searchLower) ||
        n.type?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredNotifications(filtered);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read_status: 1 } : n  // Changed from is_read: true
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAsUnread = async (notificationId) => {
    try {
      await api.post(`/notifications/${notificationId}/unread`);
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read_status: 0 } : n  // Changed from is_read: false
      ));
    } catch (error) {
      console.error('Error marking notification as unread:', error);
      toast.error('Failed to mark notification as unread');
    }
  };

  const handleDelete = async (notificationId) => {
    const confirmed = await confirmDialog.show({
      title: 'Delete Notification',
      message: 'Are you sure you want to delete this notification?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read_status: 1 })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleDeleteAllRead = async () => {
    const confirmed = await confirmDialog.show({
      title: 'Delete Read Notifications',
      message: 'Are you sure you want to delete all read notifications?',
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await api.delete('/notifications/clear-read');
      setNotifications(notifications.filter(n => n.read_status !== 1));
      toast.success('Read notifications deleted');
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      toast.error('Failed to delete read notifications');
    }
  };

  const getNotificationIcon = (type) => {
    // Deadline and overdue alerts
    if (type === 'deadline_alert' || type === 'task_overdue') {
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
    // Task-related notifications
    if (type === 'task_assigned' || type === 'task_updated' || type === 'task_completed' || type === 'comment_added') {
      return <CheckCircle className="w-5 h-5 text-blue-500" />;
    }
    // System/Registration notifications
    if (type === 'new_registration' || type === 'registration_approved' || type === 'registration_rejected') {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
    // User-related notifications
    if (type === 'user_activated' || type === 'user_deactivated' || type === 'password_changed') {
      return <Info className="w-5 h-5 text-green-500" />;
    }
    // Default
    return <Bell className="w-5 h-5 text-gray-500" />;
  };

  const getNotificationCategory = (type) => {
    // Deadline alerts
    if (type === 'deadline_alert' || type === 'task_overdue') {
      return 'Urgent';
    }
    // Task-related notifications
    if (type === 'task_assigned' || type === 'task_updated' || type === 'task_completed' || type === 'comment_added') {
      return 'Task';
    }
    // System/Registration notifications
    if (type === 'new_registration' || type === 'registration_approved' || type === 'registration_rejected') {
      return 'System';
    }
    // User-related notifications
    if (type === 'user_activated' || type === 'user_deactivated' || type === 'password_changed') {
      return 'User';
    }
    // Default
    return type;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600 mt-1">Manage your notifications and alerts</p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={loading || refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh notifications"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unread</p>
              <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Read</p>
              <p className="text-2xl font-bold text-green-600">{stats.read}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">🚨 Urgent</p>
              <p className="text-2xl font-bold text-red-700">{stats.urgent}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Task</p>
              <p className="text-2xl font-bold text-blue-600">{stats.task}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">System</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.system}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">User</p>
              <p className="text-2xl font-bold text-green-600">{stats.user}</p>
            </div>
            <Info className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters and Bulk Actions */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search notifications..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="urgent">🚨 Urgent (Deadlines)</option>
            <option value="task">Task</option>
            <option value="system">System</option>
            <option value="user">User</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          {/* Bulk Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleMarkAllAsRead}
              disabled={stats.unread === 0}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Mark All Read</span>
            </button>
            <button
              onClick={handleDeleteAllRead}
              disabled={stats.read === 0}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              title="Delete all read"
            >
              <Trash className="w-4 h-4" />
              <span className="hidden sm:inline">Delete Read</span>
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Showing {filteredNotifications.length} of {notifications.length} notifications
        </div>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications found</h3>
          <p className="text-gray-600">
            {filters.search || filters.type !== 'all' || filters.status !== 'all'
              ? 'Try adjusting your filters'
              : 'You have no notifications at the moment'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const isUrgent = notification.type === 'deadline_alert' || notification.type === 'task_overdue';
            const isUnread = notification.read_status !== 1;
            
            return (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-sm border transition-all ${
                isUrgent && isUnread
                  ? 'bg-red-50 border-red-300 border-2'
                  : isUrgent
                  ? 'bg-red-50 border-red-200'
                  : isUnread
                  ? 'bg-white border-red-200'
                  : 'bg-white border-gray-200 opacity-75'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="mt-1">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {notification.title && (
                    <h3 className={`font-semibold mb-1 ${
                      isUrgent ? 'text-red-800' : isUnread ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {notification.title}
                    </h3>
                  )}
                  <p className={`text-sm mb-2 ${
                    isUrgent ? 'text-red-700' : isUnread ? 'text-gray-700' : 'text-gray-600'
                  }`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(notification.created_at), 'MMM dd, yyyy hh:mm a')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full capitalize font-medium ${
                      isUrgent 
                        ? 'bg-red-100 text-red-700 border border-red-300' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {getNotificationCategory(notification.type)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {notification.read_status === 1 ? (
                    <button
                      onClick={() => handleMarkAsUnread(notification.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Mark as unread"
                    >
                      <Bell className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
