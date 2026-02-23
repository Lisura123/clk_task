import { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Check, 
  X, 
  AlertCircle, 
  Filter,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  Download
} from 'lucide-react';
import { leaveAPI, departmentAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function LeaveApproval() {
  const { user } = useAuthStore();
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [loading, setLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [teamOnLeave, setTeamOnLeave] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [yearFilter, departmentFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingRes, allRes, statsRes, teamRes, deptsRes] = await Promise.all([
        leaveAPI.getPendingLeaves(),
        leaveAPI.getAllLeaves({ year: yearFilter, department_id: departmentFilter !== 'all' ? departmentFilter : undefined }),
        leaveAPI.getStatistics({ year: yearFilter }),
        leaveAPI.getTeamOnLeave(),
        departmentAPI.getAllDepartments(),
      ]);
      
      setPendingLeaves(pendingRes.data.data || []);
      setAllLeaves(allRes.data.data || []);
      setStatistics(statsRes.data.data || null);
      setTeamOnLeave(teamRes.data.data || []);
      setDepartments(deptsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    const confirmed = await confirmDialog({
      type: 'success',
      title: 'Approve Leave Request',
      message: 'Are you sure you want to approve this leave request?',
      confirmText: 'Approve',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    
    try {
      setProcessing(true);
      await leaveAPI.approveLeave(id);
      toast.success('Leave request approved successfully');
      fetchData();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error(error.response?.data?.message || 'Failed to approve leave');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.warning('Please provide a reason for rejection');
      return;
    }
    
    try {
      setProcessing(true);
      await leaveAPI.rejectLeave(selectedLeave.id, { reason: rejectReason });
      toast.success('Leave request rejected');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedLeave(null);
      fetchData();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error(error.response?.data?.message || 'Failed to reject leave');
    } finally {
      setProcessing(false);
    }
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
    // Use status_label from API if available (handles Procurement employees correctly)
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

  const getApprovalButtonLabel = (leave) => {
    // For super admin
    if (user?.role === 'admin') {
      if (leave.status === 'hod_approved') {
        return 'Final Approve';
      }
      return 'Approve';
    }
    // For HOD
    return 'Approve (First Level)';
  };

  const filteredLeaves = allLeaves.filter(leave => {
    let matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
    if (statusFilter === 'pending') {
      matchesStatus = leave.status === 'pending' || leave.status === 'hod_approved';
    }
    const matchesSearch = !searchTerm || 
      leave.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leave.leave_type?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black">Leave Management</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage and approve leave requests</p>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{statistics.pending_count}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Check className="w-4 h-4" />
              <span className="text-xs font-medium">Approved</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{statistics.approved_count}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <X className="w-4 h-4" />
              <span className="text-xs font-medium">Rejected</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{statistics.rejected_count}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium">Total Requests</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{statistics.total_requests}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">Days Taken</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{statistics.total_days_taken}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">On Leave Today</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{statistics.employees_on_leave_today}</p>
          </div>
        </div>
      )}

      {/* Team on Leave Today */}
      {teamOnLeave.length > 0 && (
        <div className="bg-orange-50 rounded-xl p-4 mb-6 border border-orange-100">
          <h3 className="text-sm font-semibold text-orange-800 mb-2">🏖️ On Leave Today</h3>
          <div className="flex flex-wrap gap-2">
            {teamOnLeave.map((leave) => (
              <span 
                key={leave.id}
                className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-orange-200"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: leave.leave_type?.color || '#F97316' }}></span>
                {leave.user?.name} ({leave.leave_type?.name})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pending Requests
          {pendingLeaves.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
              {pendingLeaves.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Requests
        </button>
      </div>

      {/* Filters for All Tab */}
      {activeTab === 'all' && (
        <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 border border-gray-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {user?.role === 'admin' && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            )}
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
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
        </div>
      ) : activeTab === 'pending' ? (
        // Pending Requests
        pendingLeaves.length > 0 ? (
          <div className="space-y-3">
            {pendingLeaves.map((leave) => (
              <div 
                key={leave.id}
                className={`bg-white rounded-xl border shadow-sm p-4 ${
                  leave.status === 'hod_approved' ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                        {leave.user?.name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{leave.user?.name}</h3>
                        <p className="text-xs text-gray-500">{leave.department?.name} • {
                          leave.user?.role === 'hod' ? 'HOD' : 
                          leave.user?.role === 'senior_employee' ? 'Senior Employee' : 
                          'Employee'
                        }</p>
                      </div>
                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(leave.status)}`}>
                        {getStatusLabel(leave)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: leave.leave_type?.color || '#3B82F6' }}
                      ></span>
                      <span className="font-medium text-gray-800">{leave.leave_type?.name}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">{leave.total_days} days</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{leave.reason}</p>
                    {/* Show HOD approval info if applicable */}
                    {leave.status === 'hod_approved' && leave.hod_approved_by && (
                      <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        HOD approved by {leave.hod_approved_by_user?.name || 'HOD'} on {new Date(leave.hod_approved_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedLeave(leave); setShowDetailModal(true); }}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleApprove(leave.id)}
                      disabled={processing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50"
                    >
                      {getApprovalButtonLabel(leave)}
                    </button>
                    <button
                      onClick={() => { setSelectedLeave(leave); setShowRejectModal(true); }}
                      disabled={processing}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
            <Check className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-600">No pending leave requests to review.</p>
          </div>
        )
      ) : (
        // All Requests
        filteredLeaves.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                            {leave.user?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{leave.user?.name}</p>
                            <p className="text-xs text-gray-500">{leave.department?.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: leave.leave_type?.color || '#3B82F6' }}
                          ></span>
                          <span className="text-sm text-gray-900">{leave.leave_type?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(leave.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(leave.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{leave.total_days}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(leave.status)}`}>
                          {getStatusLabel(leave)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(leave.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setSelectedLeave(leave); setShowDetailModal(true); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No leave requests</h3>
            <p className="text-gray-600">No leave requests found for the selected filters.</p>
          </div>
        )
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Leave Request Details</h2>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedLeave(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Employee Info */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-lg font-medium">
                  {selectedLeave.user?.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedLeave.user?.name}</h3>
                  <p className="text-sm text-gray-500">{selectedLeave.department?.name}</p>
                  {selectedLeave.user?.role && (
                    <span className="text-xs text-gray-400 capitalize">{selectedLeave.user.role}</span>
                  )}
                </div>
                <span className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(selectedLeave.status)}`}>
                  {getStatusLabel(selectedLeave)}
                </span>
              </div>

              {/* Leave Info */}
              <div className="flex items-center gap-3">
                <span 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedLeave.leave_type?.color || '#3B82F6' }}
                ></span>
                <h3 className="text-lg font-semibold">{selectedLeave.leave_type?.name}</h3>
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
                          {selectedLeave.hod_approver?.name && ` by ${selectedLeave.hod_approver.name}`}
                        </p>
                      ) : selectedLeave.user?.role === 'hod' ? (
                        <p className="text-xs text-gray-400">Skipped (HOD self-request)</p>
                      ) : (
                        <p className="text-xs text-gray-400">Pending</p>
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
                          {selectedLeave.admin_approver?.name && ` by ${selectedLeave.admin_approver.name}`}
                        </p>
                      ) : selectedLeave.status === 'approved' && selectedLeave.approved_at ? (
                        <p className="text-xs text-green-600">
                          Approved on {new Date(selectedLeave.approved_at).toLocaleDateString()}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">Pending</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Reason</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{selectedLeave.reason}</p>
              </div>

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

              {/* Action Buttons for Pending or HOD Approved */}
              {(selectedLeave.status === 'pending' || selectedLeave.status === 'hod_approved') && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleApprove(selectedLeave.id)}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium disabled:opacity-50"
                  >
                    {selectedLeave.status === 'hod_approved' ? 'Final Approve' : 'Approve'}
                  </button>
                  <button
                    onClick={() => { setShowDetailModal(false); setShowRejectModal(true); }}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Reject Leave Request</h2>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Please provide a reason for rejecting {selectedLeave.user?.name}'s leave request.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                placeholder="Enter rejection reason..."
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRejectModal(false); setRejectReason(''); setSelectedLeave(null); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={processing || !rejectReason.trim()}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  {processing ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
