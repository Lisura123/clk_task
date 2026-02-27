import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  X, 
  Check, 
  AlertCircle, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Eye,
  Trash2,
  Upload
} from 'lucide-react';
import { leaveAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function MyLeaves() {
  const { user } = useAuthStore();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [calculatedDays, setCalculatedDays] = useState(null);
  
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    start_half: 'full',
    end_half: 'full',
    reason: '',
    days_note: '',
    lieu_date: '',
    emergency_contact: '',
    emergency_phone: '',
    attachment: null,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [yearFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leavesRes, balancesRes, typesRes, statsRes] = await Promise.all([
        leaveAPI.getMyLeaves({ year: yearFilter }),
        leaveAPI.getMyBalances({ year: yearFilter }),
        leaveAPI.getLeaveTypes(),
        leaveAPI.getStatistics({ year: yearFilter }),
      ]);
      
      setLeaves(leavesRes.data.data || []);
      setBalances(balancesRes.data.data || []);
      setLeaveTypes(typesRes.data.data || []);
      setStatistics(statsRes.data.data || null);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeave = async (e) => {
    e.preventDefault();
    setFormErrors({});
    
    if (!formData.leave_type_id) {
      setFormErrors({ leave_type_id: 'Please select a leave type' });
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      setFormErrors({ dates: 'Please select start and end dates' });
      return;
    }
    if (!formData.reason.trim()) {
      setFormErrors({ reason: 'Please provide a reason' });
      return;
    }

    try {
      setSubmitting(true);
      
      const data = new FormData();
      data.append('leave_type_id', formData.leave_type_id);
      data.append('start_date', formData.start_date);
      data.append('end_date', formData.end_date);
      data.append('start_half', formData.start_half);
      data.append('end_half', formData.end_half);
      data.append('reason', formData.reason);
      if (formData.days_note) data.append('days_note', formData.days_note);
      if (formData.lieu_date) data.append('lieu_date', formData.lieu_date);
      if (formData.emergency_contact) data.append('emergency_contact', formData.emergency_contact);
      if (formData.emergency_phone) data.append('emergency_phone', formData.emergency_phone);
      if (formData.attachment) data.append('attachment', formData.attachment);

      await leaveAPI.createLeave(data);
      
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating leave:', error);
      if (error.response?.data?.message) {
        setFormErrors({ submit: error.response.data.message });
      } else if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (id) => {
    const confirmed = await confirmDialog.show({
      type: 'warning',
      title: 'Cancel Leave Request',
      message: 'Are you sure you want to cancel this leave request?',
      confirmText: 'Yes, Cancel',
      cancelText: 'No, Keep'
    });
    if (!confirmed) return;
    
    try {
      await leaveAPI.cancelLeave(id);
      toast.success('Leave request cancelled successfully');
      fetchData();
    } catch (error) {
      console.error('Error cancelling leave:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel leave');
    }
  };

  const calculateLeaveDays = async () => {
    if (!formData.start_date || !formData.end_date) return;
    
    try {
      const res = await leaveAPI.calculateDays({
        start_date: formData.start_date,
        end_date: formData.end_date,
        start_half: formData.start_half,
        end_half: formData.end_half,
      });
      setCalculatedDays(res.data.data.total_days);
    } catch (error) {
      console.error('Error calculating days:', error);
    }
  };

  useEffect(() => {
    calculateLeaveDays();
  }, [formData.start_date, formData.end_date, formData.start_half, formData.end_half]);

  const resetForm = () => {
    setFormData({
      leave_type_id: '',
      start_date: '',
      end_date: '',
      start_half: 'full',
      end_half: 'full',
      reason: '',
      days_note: '',
      lieu_date: '',
      emergency_contact: '',
      emergency_phone: '',
      attachment: null,
    });
    setCalculatedDays(null);
    setFormErrors({});
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'hod_approved': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (leave) => {
    // Use status_label from API if available (handles HR and other employees correctly)
    if (typeof leave === 'object' && leave.status_label) {
      return leave.status_label;
    }
    // Fallback for when just status string is passed
    const status = typeof leave === 'object' ? leave.status : leave;
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending HOD Approval';
      case 'hod_approved': return 'Pending Admin Approval';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const filteredLeaves = leaves.filter(leave => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return leave.status === 'pending' || leave.status === 'hod_approved';
    return leave.status === statusFilter;
  });

  const selectedLeaveType = leaveTypes.find(t => t.id === parseInt(formData.leave_type_id));
  const selectedBalance = balances.find(b => b.leave_type?.id === parseInt(formData.leave_type_id));

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black">My Leaves</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your leave requests and balances</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Apply Leave</span>
        </button>
      </div>

      {/* Leave Balances */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Leave Balances - {yearFilter}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {balances.map((balance) => (
            <div 
              key={balance.id}
              className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
              style={{ borderLeftColor: balance.leave_type?.color || '#3B82F6', borderLeftWidth: '4px' }}
            >
              <h3 className="text-sm font-medium text-gray-700 truncate">{balance.leave_type?.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">{balance.available_days}</span>
                <span className="text-sm text-gray-500">/ {balance.total_entitlement}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Used: {balance.used_days} | Pending: {balance.pending_days}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics Summary */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">Total Entitlement</span>
            </div>
            <p className="text-xl font-bold text-blue-700">{statistics.total_entitlement} days</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Check className="w-4 h-4" />
              <span className="text-xs font-medium">Used</span>
            </div>
            <p className="text-xl font-bold text-green-700">{statistics.total_used} days</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Pending</span>
            </div>
            <p className="text-xl font-bold text-yellow-700">{statistics.total_pending} days</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">Available</span>
            </div>
            <p className="text-xl font-bold text-purple-700">{statistics.total_available} days</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYearFilter(yearFilter - 1)}
              className="p-1.5 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">{yearFilter}</span>
            <button
              onClick={() => setYearFilter(yearFilter + 1)}
              className="p-1.5 hover:bg-gray-100 rounded"
              disabled={yearFilter >= new Date().getFullYear()}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Leave Requests List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
        </div>
      ) : filteredLeaves.length > 0 ? (
        <div className="space-y-3">
          {filteredLeaves.map((leave) => (
            <div 
              key={leave.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: leave.leave_type?.color || '#3B82F6' }}
                    ></span>
                    <h3 className="font-semibold text-gray-900">{leave.leave_type?.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(leave.status)}`}>
                      {getStatusLabel(leave)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">
                      {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {leave.start_date !== leave.end_date && (
                        <> - {new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                      )}
                      {leave.start_date === leave.end_date && (
                        <>, {new Date(leave.end_date).getFullYear()}</>
                      )}
                    </span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span>{leave.total_days} {leave.total_days === 1 ? 'day' : 'days'}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{leave.reason}</p>
                  {leave.days_note && (
                    <p className="text-sm text-blue-500 mt-1 line-clamp-1">📅 {leave.days_note}</p>
                  )}
                  {leave.lieu_date && (
                    <p className="text-sm text-amber-600 mt-1 line-clamp-1">
                      🔄 Lieu for working on {new Date(leave.lieu_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelectedLeave(leave); setShowDetailModal(true); }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {(leave.status === 'pending' || leave.status === 'hod_approved' || (leave.status === 'approved' && new Date(leave.start_date) > new Date())) && (
                    <button
                      onClick={() => handleCancelLeave(leave.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Cancel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No leave requests</h3>
          <p className="text-gray-600">You haven't applied for any leave yet.</p>
        </div>
      )}

      {/* Create Leave Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Apply for Leave</h2>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="p-4 space-y-4">
              {formErrors.submit && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{formErrors.submit}</span>
                </div>
              )}

              {/* Leave Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                <select
                  value={formData.leave_type_id}
                  onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  required
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.filter(t => t.is_active).map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                {selectedBalance && (
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {selectedBalance.available_days} days
                  </p>
                )}
                {formErrors.leave_type_id && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.leave_type_id}</p>
                )}
              </div>

              {/* Lieu Leave - Date Worked Field */}
              {selectedLeaveType?.code?.toLowerCase() === 'lieu' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-amber-800 mb-1">
                    📅 Date You Worked (that entitles this lieu leave) *
                  </label>
                  <input
                    type="date"
                    value={formData.lieu_date}
                    onChange={(e) => setFormData({ ...formData, lieu_date: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                    required
                  />
                  <p className="text-xs text-amber-600 mt-1">
                    Select the date you actually worked (e.g., a holiday or day off) that earns you this compensatory leave
                  </p>
                  {formErrors.lieu_date && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.lieu_date}</p>
                  )}
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedLeaveType?.code?.toLowerCase() === 'lieu' ? 'Leave Date *' : 'Start Date *'}
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    {...(selectedLeaveType?.code?.toLowerCase() !== 'lieu' ? { min: new Date().toISOString().split('T')[0] } : {})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedLeaveType?.code?.toLowerCase() === 'lieu' ? 'Leave End Date *' : 'End Date *'}
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date || (selectedLeaveType?.code?.toLowerCase() !== 'lieu' ? new Date().toISOString().split('T')[0] : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Half Day Options */}
              {formData.start_date && formData.end_date && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Day</label>
                    <select
                      value={formData.start_half}
                      onChange={(e) => setFormData({ ...formData, start_half: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-sm"
                    >
                      <option value="full">Full Day</option>
                      <option value="first_half">First Half</option>
                      <option value="second_half">Second Half</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Day</label>
                    <select
                      value={formData.end_half}
                      onChange={(e) => setFormData({ ...formData, end_half: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none text-sm"
                    >
                      <option value="full">Full Day</option>
                      <option value="first_half">First Half</option>
                      <option value="second_half">Second Half</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Calculated Days */}
              {calculatedDays !== null && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">Total Leave Days</span>
                    <span className="text-lg font-bold text-blue-700">{calculatedDays} days</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Excludes weekends and holidays</p>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                  placeholder="Please provide a reason for your leave..."
                  required
                />
                {formErrors.reason && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.reason}</p>
                )}
              </div>

              {/* Contact Phone - Where employee can be reached */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Telephone No.</label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="Phone number where you can be contacted during leave"
                />
                <p className="text-xs text-gray-500 mt-1">Provide a number where you can be reached during your absence</p>
              </div>

              {/* Days Note - Specify which days leave is taken */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Days Specification (Optional)</label>
                <textarea
                  value={formData.days_note}
                  onChange={(e) => setFormData({ ...formData, days_note: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                  placeholder="E.g., Taking Monday and Wednesday off, working Tuesday..."
                />
                <p className="text-xs text-gray-500 mt-1">Specify which days the leave is taken if applicable</p>
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.emergency_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="Phone number"
                  />
                </div>
              </div>

              {/* Attachment */}
              {selectedLeaveType?.requires_attachment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attachment {selectedLeaveType?.requires_attachment ? '*' : ''}
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <input
                      type="file"
                      id="attachment"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setFormData({ ...formData, attachment: e.target.files[0] })}
                    />
                    <label htmlFor="attachment" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        {formData.attachment ? formData.attachment.name : 'Click to upload'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG up to 5MB</p>
                    </label>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 pb-4 sm:pb-0">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Detail Modal */}
      {showDetailModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Leave Details</h2>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedLeave(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <span 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedLeave.leave_type?.color || '#3B82F6' }}
                ></span>
                <h3 className="text-lg font-semibold">{selectedLeave.leave_type?.name}</h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(selectedLeave.status)}`}>
                  {getStatusLabel(selectedLeave)}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Duration</span>
                  <span className="text-sm font-medium">
                    {new Date(selectedLeave.start_date).toLocaleDateString()} - {new Date(selectedLeave.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Days</span>
                  <span className="text-sm font-medium">{selectedLeave.total_days} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Applied On</span>
                  <span className="text-sm font-medium">{new Date(selectedLeave.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Two-Level Approval Timeline */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Approval Progress</h4>
                <div className="space-y-3">
                  {/* HOD Approval Step */}
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      selectedLeave.hod_approved_at 
                        ? 'bg-green-100 text-green-600' 
                        : selectedLeave.status === 'rejected' 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-gray-200 text-gray-400'
                    }`}>
                      {selectedLeave.hod_approved_at ? (
                        <Check className="w-4 h-4" />
                      ) : selectedLeave.status === 'rejected' ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">1</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">HOD Approval</p>
                      {selectedLeave.hod_approved_at ? (
                        <p className="text-xs text-green-600">
                          Approved on {new Date(selectedLeave.hod_approved_at).toLocaleDateString()}
                          {selectedLeave.hod_approved_by?.name && ` by ${selectedLeave.hod_approved_by.name}`}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">
                          {selectedLeave.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Admin Approval Step */}
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      selectedLeave.admin_approved_at || selectedLeave.status === 'approved'
                        ? 'bg-green-100 text-green-600' 
                        : selectedLeave.status === 'rejected' 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-gray-200 text-gray-400'
                    }`}>
                      {selectedLeave.admin_approved_at || selectedLeave.status === 'approved' ? (
                        <Check className="w-4 h-4" />
                      ) : selectedLeave.status === 'rejected' ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <span className="text-xs">2</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Admin Approval</p>
                      {selectedLeave.admin_approved_at ? (
                        <p className="text-xs text-green-600">
                          Approved on {new Date(selectedLeave.admin_approved_at).toLocaleDateString()}
                          {selectedLeave.admin_approved_by?.name && ` by ${selectedLeave.admin_approved_by.name}`}
                        </p>
                      ) : selectedLeave.status === 'approved' && selectedLeave.approved_at ? (
                        <p className="text-xs text-green-600">
                          Approved on {new Date(selectedLeave.approved_at).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">
                          {selectedLeave.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Reason</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedLeave.reason}</p>
              </div>

              {selectedLeave.days_note && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Days Specification</h4>
                  <p className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3">{selectedLeave.days_note}</p>
                </div>
              )}

              {selectedLeave.lieu_date && (
                <div>
                  <h4 className="text-sm font-medium text-amber-700 mb-1">🔄 Lieu Leave — Date Worked</h4>
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                    Employee worked on {new Date(selectedLeave.lieu_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} and is taking compensatory leave.
                  </p>
                </div>
              )}

              {selectedLeave.rejection_reason && (
                <div>
                  <h4 className="text-sm font-medium text-red-700 mb-1">Rejection Reason</h4>
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{selectedLeave.rejection_reason}</p>
                </div>
              )}

              {selectedLeave.emergency_contact && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Emergency Contact</h4>
                  <p className="text-sm text-gray-600">
                    {selectedLeave.emergency_contact} - {selectedLeave.emergency_phone}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
