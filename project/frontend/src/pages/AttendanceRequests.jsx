import { useState, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, FileText, Send, X, CheckCircle,
  XCircle, AlertCircle, ChevronLeft, ChevronRight, Plus,
  Briefcase, Users, Building, Car, GraduationCap, MoreHorizontal,
  Eye, Trash2, RefreshCw
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

const REASON_TYPES = {
  client_visit: { label: 'Client Visit', icon: Users, color: 'blue' },
  field_work: { label: 'Field Work', icon: Car, color: 'green' },
  training: { label: 'Training', icon: GraduationCap, color: 'purple' },
  meeting: { label: 'Meeting', icon: Briefcase, color: 'orange' },
  other: { label: 'Other', icon: MoreHorizontal, color: 'gray' },
};

export default function AttendanceRequests() {
  const { user } = useAuthStore();
  const toast = useToast();
  const confirmDialog = useConfirm();

  const [activeTab, setActiveTab] = useState('my-requests'); // my-requests, pending-approval, approved-requests
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 });

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    in_time: '09:00',
    out_time: '18:00',
    reason_type: 'client_visit',
    reason: '',
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Check user roles
  const isHod = user?.role === 'hod' || user?.role === 'admin';
  const isHR = (user?.department_name?.toLowerCase() === 'hr') ||
               (user?.department?.toLowerCase() === 'hr') ||
               (user?.department_id == 12);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
    loadStatistics();
  }, [activeTab]);

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      let endpoint = '/attendance-requests/my';
      if (activeTab === 'pending-approval' && (isHod || isAdmin)) {
        endpoint = '/attendance-requests/pending';
      } else if (activeTab === 'approved-requests' && (isHR || isAdmin)) {
        endpoint = '/attendance-requests/approved';
      }

      const response = await api.get(`${endpoint}?page=${page}`);
      setRequests(response.data.data || []);
      setPagination({
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
      });
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await api.get('/attendance-requests/statistics');
      setStatistics(response.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!formData.date || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/attendance-requests', formData);
      toast.success('Attendance request submitted successfully');
      setShowRequestModal(false);
      setFormData({
        date: '',
        in_time: '09:00',
        out_time: '18:00',
        reason_type: 'client_visit',
        reason: '',
        location: '',
      });
      loadData();
      loadStatistics();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (id) => {
    const confirmed = await confirmDialog.show({
      title: 'Withdraw Request',
      message: 'Are you sure you want to withdraw this attendance request?',
      type: 'warning',
      confirmText: 'Withdraw',
    });

    if (confirmed) {
      try {
        await api.delete(`/attendance-requests/${id}`);
        toast.success('Request withdrawn successfully');
        loadData();
        loadStatistics();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to withdraw request');
      }
    }
  };

  const handleApprove = async (id, reviewNotes = '') => {
    try {
      await api.post(`/attendance-requests/${id}/approve`, { review_notes: reviewNotes });
      toast.success('Request approved successfully');
      loadData();
      loadStatistics();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason === null) return; // User cancelled
    if (!reason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      await api.post(`/attendance-requests/${id}/reject`, { review_notes: reason });
      toast.success('Request rejected');
      loadData();
      loadStatistics();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleAddToAttendance = async (id) => {
    try {
      await api.post(`/attendance-requests/${id}/add-to-attendance`);
      toast.success('Added to attendance records successfully');
      loadData();
      loadStatistics();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add to attendance');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const icons = {
      pending: AlertCircle,
      approved: CheckCircle,
      rejected: XCircle,
    };
    const Icon = icons[status] || AlertCircle;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getReasonBadge = (reasonType) => {
    const config = REASON_TYPES[reasonType] || REASON_TYPES.other;
    const Icon = config.icon;
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      gray: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClasses[config.color]}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Attendance Requests</h1>
          <p className="text-sm text-gray-600 mt-1">Request attendance for out-of-office work</p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Request</span>
        </button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{statistics.my_pending || 0}</p>
                <p className="text-xs text-gray-600">My Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{statistics.my_approved || 0}</p>
                <p className="text-xs text-gray-600">My Approved</p>
              </div>
            </div>
          </div>
          {(isHod || isAdmin) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.pending_approval || 0}</p>
                  <p className="text-xs text-gray-600">Pending Approval</p>
                </div>
              </div>
            </div>
          )}
          {(isHR || isAdmin) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{statistics.approved_not_synced || 0}</p>
                  <p className="text-xs text-gray-600">To Sync</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('my-requests')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'my-requests'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          My Requests
        </button>
        {(isHod || isAdmin) && (
          <button
            onClick={() => setActiveTab('pending-approval')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'pending-approval'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending Approval
            {statistics?.pending_approval > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                {statistics.pending_approval}
              </span>
            )}
          </button>
        )}
        {(isHR || isAdmin) && (
          <button
            onClick={() => setActiveTab('approved-requests')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'approved-requests'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Approved (For Sync)
            {statistics?.approved_not_synced > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs">
                {statistics.approved_not_synced}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <FileText className="w-12 h-12 mb-4 text-gray-300" />
            <p>No requests found</p>
            {activeTab === 'my-requests' && (
              <button
                onClick={() => setShowRequestModal(true)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Submit New Request
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {(activeTab !== 'my-requests') && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    {(activeTab !== 'my-requests') && (
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{request.user?.name}</p>
                          <p className="text-xs text-gray-500">{request.user?.emp_code}</p>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(request.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="text-green-600">{formatTime(request.in_time)}</span>
                        <span className="text-gray-400 mx-1">-</span>
                        <span className="text-red-600">{formatTime(request.out_time)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getReasonBadge(request.reason_type)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </p>
                      {request.location && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {request.location}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        {getStatusBadge(request.status)}
                        {request.synced_to_attendance && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            Synced
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* My Requests Actions */}
                        {activeTab === 'my-requests' && request.status === 'pending' && (
                          <button
                            onClick={() => handleWithdraw(request.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Withdraw"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* HOD Approval Actions */}
                        {activeTab === 'pending-approval' && request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* HR Sync Actions */}
                        {activeTab === 'approved-requests' && !request.synced_to_attendance && (
                          <button
                            onClick={() => handleAddToAttendance(request.id)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            title="Add to Attendance"
                          >
                            Add to Attendance
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => loadData(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.current_page} of {pagination.last_page}
            </span>
            <button
              onClick={() => loadData(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.last_page}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Attendance Request</h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-4 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">In Time</label>
                  <input
                    type="time"
                    value={formData.in_time}
                    onChange={(e) => setFormData({ ...formData, in_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Out Time</label>
                  <input
                    type="time"
                    value={formData.out_time}
                    onChange={(e) => setFormData({ ...formData, out_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Reason Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(REASON_TYPES).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, reason_type: key })}
                        className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-colors ${
                          formData.reason_type === key
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${formData.reason_type === key ? 'text-red-600' : 'text-gray-500'}`} />
                        <span className={`text-sm ${formData.reason_type === key ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location (Optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Where were you working?"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason/Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Describe the work you did outside the office..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  required
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
