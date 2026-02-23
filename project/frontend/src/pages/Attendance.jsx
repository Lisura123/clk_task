import { useState, useEffect } from 'react';
import { 
  Upload, Download, Search, Calendar, Filter, RefreshCw, 
  Clock, Users, Building2, FileSpreadsheet, X, CheckCircle,
  AlertCircle, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function Attendance() {
  const { user } = useAuthStore();
  const toast = useToast();
  const confirmDialog = useConfirm();
  
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [noEmpCodeMessage, setNoEmpCodeMessage] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: 0
  });
  
  // Filters - default to showing last 3 months of data
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3); // Go back 3 months
    return date.toISOString().split('T')[0].slice(0, 7) + '-01';
  };
  
  const [filters, setFilters] = useState({
    start_date: getDefaultStartDate(), // First day of 3 months ago
    end_date: new Date().toISOString().split('T')[0],
    department: '',
    emp_code: '',
    search: ''
  });
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Check if user is from Procurement department (case-insensitive, partial match)
  const isProcurement = user?.department_name?.toLowerCase()?.includes('procurement') || 
                        user?.department?.toLowerCase()?.includes('procurement');
  
  // Check if user is admin or HOD
  const isAdmin = user?.role === 'admin';
  const isHod = user?.role === 'hod';
  
  // Regular employees can only view their own attendance
  const isRegularEmployee = !isAdmin && !isHod && !isProcurement;
  
  // Only Procurement users can upload and delete (regardless of role)
  const canUpload = isProcurement;
  const canDelete = isProcurement;

  useEffect(() => {
    fetchAttendance();
    fetchStatistics();
  }, []);

  const fetchAttendance = async (page = 1) => {
    try {
      setLoading(true);
      setNoEmpCodeMessage(null);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('per_page', pagination.per_page);
      
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.department) params.append('department', filters.department);
      if (filters.emp_code) params.append('emp_code', filters.emp_code);
      if (filters.search) params.append('search', filters.search);
      
      const response = await api.get(`/attendance?${params.toString()}`);
      setAttendances(response.data.data || []);
      setPagination({
        current_page: response.data.current_page || 1,
        last_page: response.data.last_page || 1,
        per_page: response.data.per_page || 50,
        total: response.data.total || 0
      });
      
      // Check if there's a message (e.g., no emp_code assigned)
      if (response.data.no_emp_code && response.data.message) {
        setNoEmpCodeMessage(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      if (error.response?.status === 403) {
        setNoEmpCodeMessage(error.response?.data?.message || 'You do not have permission to view attendance records.');
        setAttendances([]);
      } else {
        toast.error('Failed to load attendance data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const response = await api.get(`/attendance/statistics?${params.toString()}`);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleSearch = () => {
    fetchAttendance(1);
    fetchStatistics();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'application/vnd.ms-excel', 
        'text/csv',
        'application/pdf'
      ];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv|pdf)$/i)) {
        toast.error('Please select a valid Excel, CSV, or PDF file');
        return;
      }
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await api.post('/attendance/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setUploadResult(response.data);
      toast.success(`Import completed: ${response.data.imported} imported, ${response.data.updated} updated`);
      
      // Refresh data
      fetchAttendance();
      fetchStatistics();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/attendance/template', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'attendance_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download template');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog.show({
      title: 'Delete Attendance Record',
      message: 'Are you sure you want to delete this attendance record? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    
    if (confirmed) {
      try {
        await api.delete(`/attendance/${id}`);
        toast.success('Attendance record deleted');
        fetchAttendance(pagination.current_page);
        fetchStatistics();
      } catch (error) {
        toast.error('Failed to delete attendance record');
      }
    }
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return time.substring(0, 5); // Show HH:MM
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isRegularEmployee ? 'My Attendance' : 'Attendance'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isRegularEmployee 
              ? 'View your attendance records' 
              : 'View and manage employee attendance records'}
          </p>
        </div>
        
        {canUpload && (
          <div className="flex gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Template
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Excel
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{statistics.total_records}</p>
                <p className="text-sm text-gray-500">Total Records</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{statistics.unique_employees}</p>
                <p className="text-sm text-gray-500">Unique Employees</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{statistics.departments?.length || 0}</p>
                <p className="text-sm text-gray-500">Departments</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isRegularEmployee ? 'lg:grid-cols-3' : 'lg:grid-cols-5'} gap-4`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          
          {!isRegularEmployee && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="Filter by department"
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Code</label>
                <input
                  type="text"
                  placeholder="Filter by emp code"
                  value={filters.emp_code}
                  onChange={(e) => setFilters({ ...filters, emp_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </>
          )}
          
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
            <button
              onClick={() => {
                const cleared = {
                  start_date: '',
                  end_date: '',
                  department: '',
                  emp_code: '',
                  search: ''
                };
                setFilters(cleared);
                // Trigger search with cleared filters
                setTimeout(() => {
                  fetchAttendance(1);
                  fetchStatistics();
                }, 0);
              }}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              title="Clear all filters"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : attendances.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              {noEmpCodeMessage ? (
                <>
                  <p className="text-gray-600 font-medium">No Employee Code Assigned</p>
                  <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">{noEmpCodeMessage}</p>
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg max-w-md mx-auto">
                    <p className="text-amber-700 text-sm">
                      <strong>Note:</strong> Your employee code links your attendance records from the biometric system. 
                      Please contact HR or your administrator to set up your employee code.
                    </p>
                  </div>
                </>
              ) : isRegularEmployee && !user?.emp_code ? (
                <>
                  <p className="text-gray-500 font-medium">No Employee Code Assigned</p>
                  <p className="text-gray-400 text-sm mt-1">Please contact your administrator to assign your employee code.</p>
                </>
              ) : (
                <>
                  <p className="text-gray-500">No attendance records found</p>
                  {isRegularEmployee && (
                    <p className="text-gray-400 text-sm mt-1">Your attendance records will appear here once uploaded.</p>
                  )}
                </>
              )}
              {canUpload && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Upload Attendance
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emp Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FP Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Out</th>
                  {canDelete && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendances.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                        {record.emp_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {record.employee_name || <span className="text-gray-400 italic">Unknown</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.fp_code || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {record.dept_name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-sm text-green-700">
                        <Clock className="w-3 h-3" />
                        {formatTime(record.in_time)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-sm text-red-700">
                        <Clock className="w-3 h-3" />
                        {formatTime(record.out_time)}
                      </span>
                    </td>
                    {canDelete && (
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchAttendance(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="flex items-center px-3 text-sm text-gray-600">
                Page {pagination.current_page} of {pagination.last_page}
              </span>
              <button
                onClick={() => fetchAttendance(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Upload Attendance</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setUploadResult(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer"
                >
                  <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  {selectedFile ? (
                    <p className="text-sm text-gray-900 font-medium">{selectedFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">Click to select a file</p>
                      <p className="text-xs text-gray-400 mt-1">Supports .xlsx, .xls, .csv, .pdf</p>
                    </>
                  )}
                </label>
              </div>

              {/* Expected Format Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-medium mb-2">Expected Columns:</p>
                <div className="grid grid-cols-3 gap-2 text-xs text-blue-700">
                  <span>• Date</span>
                  <span>• Emp Code</span>
                  <span>• FP Code</span>
                  <span>• Dept Name</span>
                  <span>• In (time)</span>
                  <span>• Out (time)</span>
                </div>
              </div>

              {/* Upload Result */}
              {uploadResult && (
                <div className={`rounded-lg p-4 ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start gap-3">
                    {uploadResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="text-sm">
                      <p className={uploadResult.success ? 'text-green-800' : 'text-red-800'}>
                        {uploadResult.message}
                      </p>
                      {uploadResult.success && (
                        <div className="mt-2 text-green-700">
                          <p>• Imported: {uploadResult.imported} new records</p>
                          <p>• Updated: {uploadResult.updated} existing records</p>
                          {uploadResult.skipped > 0 && (
                            <p>• Skipped: {uploadResult.skipped} records</p>
                          )}
                        </div>
                      )}
                      {uploadResult.errors?.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium text-red-800">Errors:</p>
                          <ul className="list-disc list-inside text-red-700">
                            {uploadResult.errors.slice(0, 5).map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                            {uploadResult.total_errors > 5 && (
                              <li>...and {uploadResult.total_errors - 5} more errors</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
