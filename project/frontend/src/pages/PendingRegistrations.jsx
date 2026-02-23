import { useState, useEffect } from 'react';
import { UserPlus, Check, X, Search, AlertCircle } from 'lucide-react';
import { authAPI, departmentAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function PendingRegistrations() {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, deptsRes] = await Promise.all([
        authAPI.getPendingRegistrations(),
        departmentAPI.getAllDepartments()
      ]);
      setPendingUsers(usersRes.data.data || usersRes.data || []);
      setDepartments(deptsRes.data.data || deptsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch pending registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user) => {
    const confirmed = await confirmDialog({
      title: 'Approve Registration',
      message: `Are you sure you want to approve ${user.name}?`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      type: 'info'
    });
    if (!confirmed) return;
    
    setActionLoading(true);
    try {
      const response = await authAPI.approveRegistration(user.id);
      toast.success(`Registration approved for ${user.name}`);
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error(error.response?.data?.message || 'Failed to approve registration');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = (user) => {
    setSelectedUser(user);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const submitRejection = async () => {
    if (!rejectReason.trim()) {
      toast.warning('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    try {
      const response = await authAPI.rejectRegistration(selectedUser.id, rejectReason);
      toast.success(`Registration rejected for ${selectedUser.name}`);
      setShowRejectModal(false);
      setSelectedUser(null);
      setRejectReason('');
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error(error.response?.data?.message || 'Failed to reject registration');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = pendingUsers.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-black">Pending Employee Registrations</h1>
          <p className="text-gray-600 mt-1">Review and approve self-registered employee requests</p>
        </div>
        <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg">
          <span className="font-semibold">{pendingUsers.length}</span> Pending
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Self-Registration Approval Process</h3>
            <p className="text-sm text-blue-700 mt-1">
              These are employees who registered themselves through the public registration form. 
              Each requires Admin approval to activate their account and grant system access.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Pending Users */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  Pending Approval
                </span>
              </div>

              <h3 className="text-lg font-semibold text-black mb-1">{user.name}</h3>
              <p className="text-sm text-gray-600 mb-1">@{user.username}</p>
              <p className="text-sm text-gray-600 mb-1">{user.email}</p>
              {user.phone && (
                <p className="text-sm text-gray-600 mb-1">{user.phone}</p>
              )}
              
              <div className="text-sm text-gray-700 mb-3">
                <span className="font-medium">Department:</span> {user.department_name}
              </div>

              <div className="text-xs text-gray-500 mb-4">
                Registered: {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(user)}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleReject(user)}
                  disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Registrations</h3>
          <p className="text-gray-600">All caught up! No employees waiting for approval.</p>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-black mb-4">Reject Registration</h2>
            <p className="text-gray-600 mb-4">
              Rejecting registration for: <span className="font-semibold">{selectedUser.name}</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection <span className="text-red-600">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={4}
                placeholder="Please provide a reason for rejecting this registration..."
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This action will permanently delete the registration request. 
                The user will need to register again if they want to join the system.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedUser(null);
                  setRejectReason('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitRejection}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
