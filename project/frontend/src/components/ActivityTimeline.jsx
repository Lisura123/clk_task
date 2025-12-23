import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  MessageSquare, 
  Paperclip, 
  Link as LinkIcon, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  GitBranch,
  Calendar,
  Flag,
  Eye,
  Tag,
  TrendingUp,
  FileText,
  Filter,
  Search,
  Download
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const ActivityTimeline = ({ taskId, refreshTrigger = 0 }) => {
  const { token } = useAuthStore();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSystemActivities, setShowSystemActivities] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, [taskId, refreshTrigger, filterType, filterUser, showSystemActivities, page]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: 20,
        offset: (page - 1) * 20,
        includeSystem: showSystemActivities
      });

      if (filterType !== 'all') params.append('type', filterType);
      if (filterUser !== 'all') params.append('userId', filterUser);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      const response = await axios.get(
        `http://localhost:5000/api/tasks/${taskId}/activities?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setActivities(response.data.data.activities);
        setHasMore(response.data.data.pagination.hasMore);
      }
    } catch (err) {
      setError('Failed to load activity timeline');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/tasks/${taskId}/activities/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchActivities();
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:5000/api/tasks/${taskId}/activities/search?query=${encodeURIComponent(searchQuery)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setActivities(response.data.data);
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/tasks/${taskId}/activities/export?format=${format}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: format === 'csv' ? 'blob' : 'json'
        }
      );

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `task_${taskId}_activities.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = `task_${taskId}_activities.json`;
        link.click();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getActivityIcon = (type) => {
    const iconMap = {
      task_created: <FileText className="w-5 h-5" />,
      status_changed: <GitBranch className="w-5 h-5" />,
      progress_updated: <TrendingUp className="w-5 h-5" />,
      assignment_changed: <User className="w-5 h-5" />,
      due_date_changed: <Calendar className="w-5 h-5" />,
      priority_changed: <Flag className="w-5 h-5" />,
      comment_added: <MessageSquare className="w-5 h-5" />,
      file_uploaded: <Paperclip className="w-5 h-5" />,
      file_deleted: <Trash2 className="w-5 h-5" />,
      link_added: <LinkIcon className="w-5 h-5" />,
      task_edited: <Edit className="w-5 h-5" />,
      task_completed: <CheckCircle className="w-5 h-5" />,
      task_reopened: <XCircle className="w-5 h-5" />,
      watcher_added: <Eye className="w-5 h-5" />,
      tag_added: <Tag className="w-5 h-5" />,
      time_logged: <Clock className="w-5 h-5" />,
      timer_started: <Clock className="w-5 h-5" />,
      timer_stopped: <Clock className="w-5 h-5" />
    };
    return iconMap[type] || <FileText className="w-5 h-5" />;
  };

  const getActivityColor = (type) => {
    const colorMap = {
      task_created: 'bg-green-100 text-green-700',
      status_changed: 'bg-blue-100 text-blue-700',
      progress_updated: 'bg-purple-100 text-purple-700',
      assignment_changed: 'bg-orange-100 text-orange-700',
      priority_changed: 'bg-red-100 text-red-700',
      comment_added: 'bg-indigo-100 text-indigo-700',
      file_uploaded: 'bg-cyan-100 text-cyan-700',
      task_completed: 'bg-green-100 text-green-700',
      task_reopened: 'bg-yellow-100 text-yellow-700',
      time_logged: 'bg-teal-100 text-teal-700'
    };
    return colorMap[type] || 'bg-gray-100 text-gray-700';
  };

  const groupActivitiesByDate = (activities) => {
    const grouped = {};
    activities.forEach(activity => {
      const date = new Date(activity.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(activity);
    });
    return grouped;
  };

  const groupedActivities = groupActivitiesByDate(activities);

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Activity Timeline
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('json')}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search activities..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Activity Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Activities</option>
              <option value="comment_added">Comments</option>
              <option value="status_changed">Status Changes</option>
              <option value="file_uploaded">Files</option>
              <option value="time_logged">Time Logs</option>
              <option value="task_edited">Edits</option>
            </select>
          </div>

          {/* System Activities Toggle */}
          <div>
            <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
              <input
                type="checkbox"
                checked={showSystemActivities}
                onChange={(e) => setShowSystemActivities(e.target.checked)}
                className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700">Show System</span>
            </label>
          </div>
        </div>
      </div>

      {/* Activity Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.byType.slice(0, 3).map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${getActivityColor(stat.activity_type)}`}>
                  {getActivityIcon(stat.activity_type)}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {stat.activity_type.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {activities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No activities found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-3 sticky top-0 z-10">
                  <h4 className="text-sm font-semibold text-gray-700">{date}</h4>
                </div>

                {/* Activities for this date */}
                <div className="divide-y divide-gray-100">
                  {dateActivities.map((activity) => (
                    <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-4">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type)}`}>
                          {getActivityIcon(activity.activity_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              {/* User and Action */}
                              <div className="flex items-center gap-2 mb-1">
                                {activity.profile_picture ? (
                                  <img
                                    src={activity.profile_picture}
                                    alt={activity.user_name}
                                    className="w-6 h-6 rounded-full"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                                    {activity.user_name?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-semibold text-gray-900 text-sm">
                                  {activity.user_name}
                                </span>
                                <span className="text-gray-400">·</span>
                                <span className="text-xs text-gray-500 capitalize">
                                  {activity.user_role}
                                </span>
                              </div>

                              {/* Description */}
                              <p className="text-gray-700 text-sm mb-2">
                                {activity.description}
                              </p>

                              {/* Metadata */}
                              {activity.metadata && (
                                <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 inline-block">
                                  {Object.entries(activity.metadata).map(([key, value]) => (
                                    <span key={key} className="mr-3">
                                      <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Timestamp */}
                            <div className="flex-shrink-0 text-xs text-gray-500">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="p-4 text-center border-t border-gray-200">
            <button
              onClick={() => setPage(page + 1)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Load More Activities
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;
