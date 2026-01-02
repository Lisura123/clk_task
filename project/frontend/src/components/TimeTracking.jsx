import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  Plus,
  Edit2,
  Trash2,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  User
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import api, { timeEntryAPI } from '../services/api';
import useAuthStore from '../store/authStore';

const TimeTracking = ({ taskId, estimatedHours = 0, onTaskUpdate }) => {
  const { token, user } = useAuthStore();
  const [timeEntries, setTimeEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeTimer, setActiveTimer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef(null);

  // Manual entry form
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState({
    start_time: '',
    end_time: '',
    duration_minutes: '',
    description: '',
    category: 'development',
    is_billable: false
  });

  // Timer description
  const [timerDescription, setTimerDescription] = useState('');
  const [timerCategory, setTimerCategory] = useState('development');

  useEffect(() => {
    fetchTimeEntries();
    fetchTimeSummary();
    checkActiveTimer();
  }, [taskId]);

  useEffect(() => {
    if (activeTimer) {
      startElapsedTimeCounter();
    } else {
      stopElapsedTimeCounter();
    }
    return () => stopElapsedTimeCounter();
  }, [activeTimer]);

  const fetchTimeEntries = async () => {
    try {
      const response = await timeEntryAPI.getByTask(taskId);
      setTimeEntries(response.data || []);
    } catch (err) {
      console.error('Failed to fetch time entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSummary = async () => {
    try {
      const response = await timeEntryAPI.getSummary(taskId);
      setSummary(response.data);
    } catch (err) {
      console.error('Failed to fetch time summary:', err);
    }
  };

  const checkActiveTimer = async () => {
    try {
      const response = await timeEntryAPI.getRunningTimer();
      if (response.data && response.data.task_id === parseInt(taskId)) {
        setActiveTimer(response.data);
      }
    } catch (err) {
      console.error('Failed to check active timer:', err);
    }
  };

  const startElapsedTimeCounter = () => {
    if (timerIntervalRef.current) return;
    
    timerIntervalRef.current = setInterval(() => {
      if (activeTimer) {
        const start = new Date(activeTimer.start_time);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000); // seconds
        setElapsedTime(diff);
      }
    }, 1000);
  };

  const stopElapsedTimeCounter = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = async () => {
    try {
      const response = await timeEntryAPI.startTimer({
        task_id: taskId,
        description: timerDescription,
        category: timerCategory
      });

      setActiveTimer(response.data.entry);
      setTimerDescription('');
      fetchTimeEntries();
      fetchTimeSummary();
      
      // If task status was updated (from todo to in_progress), notify parent
      if (response.data.task_status_updated && onTaskUpdate) {
        onTaskUpdate();
      }
    } catch (err) {
      console.error('Failed to start timer:', err);
      alert(err.response?.data?.message || 'Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;

    try {
      await timeEntryAPI.stopTimer(activeTimer.id);
      setActiveTimer(null);
      setElapsedTime(0);
      fetchTimeEntries();
      fetchTimeSummary();
    } catch (err) {
      console.error('Failed to stop timer:', err);
      alert('Failed to stop timer');
    }
  };

  const handleAddManualEntry = async (e) => {
    e.preventDefault();

    // Calculate duration if start and end times are provided
    let duration = parseInt(manualForm.duration_minutes);
    if (!duration && manualForm.start_time && manualForm.end_time) {
      const start = new Date(manualForm.start_time);
      const end = new Date(manualForm.end_time);
      duration = Math.round((end - start) / (1000 * 60));
    }

    try {
      await timeEntryAPI.create({
        task_id: taskId,
        ...manualForm,
        duration_minutes: duration
      });

      setShowManualEntry(false);
      setManualForm({
        start_time: '',
        end_time: '',
        duration_minutes: '',
        description: '',
        category: 'development',
        is_billable: false
      });
      fetchTimeEntries();
      fetchTimeSummary();
    } catch (err) {
      console.error('Failed to add time entry:', err);
      alert('Failed to add time entry');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;

    try {
      await timeEntryAPI.delete(entryId);
      fetchTimeEntries();
      fetchTimeSummary();
    } catch (err) {
      console.error('Failed to delete entry:', err);
      alert('Failed to delete time entry');
    }
  };

  const handleExportReport = async (format = 'csv') => {
    try {
      const response = await api.get(
        `/tasks/${taskId}/time-entries/export?format=${format}`,
        { responseType: format === 'csv' ? 'blob' : 'json' }
      );

      if (format === 'csv') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `task_${taskId}_time_report.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      development: 'bg-blue-100 text-blue-700',
      testing: 'bg-purple-100 text-purple-700',
      documentation: 'bg-green-100 text-green-700',
      design: 'bg-pink-100 text-pink-700',
      meeting: 'bg-orange-100 text-orange-700',
      review: 'bg-indigo-100 text-indigo-700',
      deployment: 'bg-red-100 text-red-700',
      planning: 'bg-yellow-100 text-yellow-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[category] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timer Controls */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Time Tracker
          </h3>
          <button
            onClick={() => handleExportReport('csv')}
            className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {activeTimer ? (
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-center mb-4">
              <div className="text-5xl font-bold text-blue-600 mb-2 font-mono">
                {formatElapsedTime(elapsedTime)}
              </div>
              <div className="text-sm text-gray-600">
                {activeTimer.description || 'Working on task'}
              </div>
              <div className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(activeTimer.category)}`}>
                {activeTimer.category}
              </div>
            </div>
            <button
              onClick={handleStopTimer}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium shadow-lg"
            >
              <Square className="w-5 h-5" />
              Stop Timer
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6 shadow-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are you working on?
              </label>
              <input
                type="text"
                value={timerDescription}
                onChange={(e) => setTimerDescription(e.target.value)}
                placeholder="Task description..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={timerCategory}
                onChange={(e) => setTimerCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="development">Development</option>
                <option value="testing">Testing</option>
                <option value="documentation">Documentation</option>
                <option value="design">Design</option>
                <option value="meeting">Meeting</option>
                <option value="review">Review</option>
                <option value="deployment">Deployment</option>
                <option value="planning">Planning</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleStartTimer}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium shadow-lg"
              >
                <Play className="w-5 h-5" />
                Start Timer
              </button>
              <button
                onClick={() => setShowManualEntry(!showManualEntry)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" />
                Manual Entry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Time Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Total Time</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900">
                {summary.overall?.total_hours || 0}h
              </div>
              <div className="text-xs text-gray-500">
                {summary.overall?.total_entries || 0} entries
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Billable</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-green-600">
                {summary.overall?.billable_hours || 0}h
              </div>
              <div className="text-xs text-gray-500">
                {summary.overall?.total_hours > 0 
                  ? Math.round((summary.overall.billable_hours / summary.overall.total_hours) * 100)
                  : 0}% of total
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Estimated</span>
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold text-gray-900">
                {estimatedHours || 0}h
              </div>
              <div className="text-xs text-gray-500">
                Initial estimate
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Variance</span>
              </div>
            </div>
            <div className="mt-2">
              <div className={`text-2xl font-bold ${
                (summary.overall?.variance_hours || 0) > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {summary.overall?.variance_hours > 0 ? '+' : ''}
                {summary.overall?.variance_hours || 0}h
              </div>
              <div className="text-xs text-gray-500">
                vs estimate
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Form */}
      {showManualEntry && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Add Manual Time Entry</h4>
          <form onSubmit={handleAddManualEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={manualForm.start_time}
                  onChange={(e) => setManualForm({ ...manualForm, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time (or Duration)
                </label>
                <input
                  type="datetime-local"
                  value={manualForm.end_time}
                  onChange={(e) => setManualForm({ ...manualForm, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes) - Optional if start/end provided
              </label>
              <input
                type="number"
                value={manualForm.duration_minutes}
                onChange={(e) => setManualForm({ ...manualForm, duration_minutes: e.target.value })}
                placeholder="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={manualForm.description}
                onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What did you work on?"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={manualForm.category}
                  onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="development">Development</option>
                  <option value="testing">Testing</option>
                  <option value="documentation">Documentation</option>
                  <option value="design">Design</option>
                  <option value="meeting">Meeting</option>
                  <option value="review">Review</option>
                  <option value="deployment">Deployment</option>
                  <option value="planning">Planning</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={manualForm.is_billable}
                    onChange={(e) => setManualForm({ ...manualForm, is_billable: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Billable</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Add Entry
              </button>
              <button
                type="button"
                onClick={() => setShowManualEntry(false)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Time Entries List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900">Time Entries</h4>
        </div>

        {timeEntries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No time entries yet</p>
            <p className="text-sm mt-1">Start tracking your time to see entries here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(entry.category)}`}>
                        {entry.category}
                      </div>
                      {entry.is_billable && (
                        <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Billable
                        </div>
                      )}
                      <span className="text-sm text-gray-500">
                        {format(new Date(entry.start_time), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>

                    {entry.description && (
                      <p className="text-gray-700 text-sm mb-2">{entry.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {entry.user_name}
                      </div>
                      {entry.edited_at && (
                        <span className="text-orange-600">Edited</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {Math.floor(entry.duration_minutes / 60)}h {entry.duration_minutes % 60}m
                      </div>
                      <div className="text-xs text-gray-500">
                        {entry.is_running ? 'Running' : 'Completed'}
                      </div>
                    </div>

                    {entry.user_id === user?.id && (
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracking;
