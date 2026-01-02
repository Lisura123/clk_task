import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  X,
  FileText,
  TrendingUp
} from 'lucide-react';
import { workLogAPI } from '../services/api';
import useAuthStore from '../store/authStore';

export default function DailyWorkLog({ task, onClose, onUpdate }) {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [formData, setFormData] = useState({
    work_date: new Date().toISOString().split('T')[0],
    description: '',
    hours_worked: '',
    progress_percentage: task?.progress || 0,
    status: 'in_progress',
    blockers: ''
  });

  // Only the assigned employee can add work logs - dept_admin and super_admin can only view
  const canAddLog = task?.assigned_to_id === user?.id;

  useEffect(() => {
    fetchLogs();
  }, [task.id]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await workLogAPI.getByTask(task.id);
      setLogs(response.data || []);
    } catch (error) {
      console.error('Error fetching work logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLog) {
        await workLogAPI.update(task.id, editingLog.id, formData);
      } else {
        await workLogAPI.create(task.id, formData);
      }
      setShowAddModal(false);
      setEditingLog(null);
      resetForm();
      fetchLogs();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving work log:', error);
      alert(error.response?.data?.message || 'Failed to save work log');
    }
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setFormData({
      work_date: log.work_date.split('T')[0],
      description: log.description,
      hours_worked: log.hours_worked || '',
      progress_percentage: log.progress_percentage || 0,
      status: log.status,
      blockers: log.blockers || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (logId) => {
    if (!confirm('Are you sure you want to delete this work log?')) return;
    try {
      await workLogAPI.delete(task.id, logId);
      fetchLogs();
    } catch (error) {
      console.error('Error deleting work log:', error);
      alert('Failed to delete work log');
    }
  };

  const resetForm = () => {
    setFormData({
      work_date: new Date().toISOString().split('T')[0],
      description: '',
      hours_worked: '',
      progress_percentage: task?.progress || 0,
      status: 'in_progress',
      blockers: ''
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      case 'need_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'blocked': return 'Blocked';
      case 'need_review': return 'Need Review';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const totalHours = logs.reduce((sum, log) => sum + (parseFloat(log.hours_worked) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Daily Work Logs</h2>
            <p className="text-sm text-gray-500">Task: {task.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{logs.length}</div>
            <div className="text-xs text-gray-500">Total Logs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalHours.toFixed(1)}h</div>
            <div className="text-xs text-gray-500">Hours Logged</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{task.progress || 0}%</div>
            <div className="text-xs text-gray-500">Progress</div>
          </div>
        </div>

        {/* Add Button */}
        {canAddLog && (
          <div className="p-4 border-b">
            <button
              onClick={() => {
                resetForm();
                setEditingLog(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Log Today's Work
            </button>
          </div>
        )}

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <FileText className="w-12 h-12 mb-2" />
              <p>No work logs yet</p>
              {canAddLog && <p className="text-sm">Click "Log Today's Work" to add your first entry</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(log.work_date)}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                        {getStatusLabel(log.status)}
                      </span>
                    </div>
                    {log.user_id === user?.id && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(log)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-700 whitespace-pre-wrap mb-3">{log.description}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {log.hours_worked && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{log.hours_worked}h worked</span>
                      </div>
                    )}
                    {log.progress_percentage !== null && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>{log.progress_percentage}% progress</span>
                      </div>
                    )}
                  </div>

                  {log.blockers && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        Blockers
                      </div>
                      <p className="text-red-600 text-sm">{log.blockers}</p>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-400">
                    Logged by {log.user?.name || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingLog ? 'Edit Work Log' : 'Log Today\'s Work'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLog(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.work_date}
                  onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What did you work on? *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the work you completed today..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.hours_worked}
                    onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 4.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress_percentage}
                    onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLog(null);
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingLog ? 'Update Log' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
