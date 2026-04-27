import { useState, useEffect } from 'react';
import { 
  Upload, Download, Search, Calendar, Filter, RefreshCw, 
  Clock, Users, Building2, FileSpreadsheet, X, CheckCircle,
  AlertCircle, Trash2, ChevronLeft, ChevronRight, Edit2, Save,
  CalendarDays, TrendingUp, Timer, Sun, Moon, MapPin, Smartphone
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
  const [attendanceSource, setAttendanceSource] = useState('all'); // 'upload', 'gps', 'all'
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: 0
  });
  
  // Active quick filter for highlighting
  const [activeQuickFilter, setActiveQuickFilter] = useState(null);
  
  // Filters - default to showing today's data
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  
  const [filters, setFilters] = useState({
    start_date: getTodayDate(),
    end_date: getTodayDate(),
    department: '',
    emp_code: '',
    search: ''
  });
  
  // Quick date filter helpers
  const quickDateFilters = {
    today: () => {
      const today = getTodayDate();
      return { start_date: today, end_date: today };
    },
    yesterday: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const date = yesterday.toISOString().split('T')[0];
      return { start_date: date, end_date: date };
    },
    thisWeek: () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Monday
      return { 
        start_date: startOfWeek.toISOString().split('T')[0], 
        end_date: getTodayDate() 
      };
    },
    thisMonth: () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { 
        start_date: startOfMonth.toISOString().split('T')[0], 
        end_date: getTodayDate() 
      };
    },
    lastMonth: () => {
      const today = new Date();
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { 
        start_date: startOfLastMonth.toISOString().split('T')[0], 
        end_date: endOfLastMonth.toISOString().split('T')[0]
      };
    },
    last3Months: () => {
      const today = new Date();
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      return { 
        start_date: threeMonthsAgo.toISOString().split('T')[0], 
        end_date: getTodayDate()
      };
    }
  };
  
  const applyQuickFilter = (filterName) => {
    const dateRange = quickDateFilters[filterName]();
    const newFilters = { ...filters, ...dateRange };
    setFilters(newFilters);
    setActiveQuickFilter(filterName);
    fetchAttendance(1, newFilters);
    fetchStatistics();
  };
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadFormat, setUploadFormat] = useState('standard'); // 'standard' | 'biometric'
  const [biometricPeriodStart, setBiometricPeriodStart] = useState('');
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({ in_time: '', out_time: '' });
  
  // Check if user is from HR department (ID 12) - using all possible sources
  const isHR = (user?.department_name?.toLowerCase() === 'hr') || 
               (user?.department?.toLowerCase() === 'hr') ||
               (user?.department_id == 12) ||
               (user?.departmentRelation?.name?.toLowerCase() === 'hr');
  
  // Check if user is admin or HOD
  const isAdmin = user?.role === 'admin';
  const isHod = user?.role === 'hod';
  
  // Regular employees can only view their own attendance
  const isRegularEmployee = !isAdmin && !isHod && !isHR;
  
  // HR and Admin users can upload, edit, and delete
  const canUpload = isHR || isAdmin;
  const canEdit = isHR || isAdmin;
  const canDelete = isHR || isAdmin;

  useEffect(() => {
    fetchAttendance();
    fetchStatistics();
  }, [attendanceSource]);

  const fetchAttendance = async (page = 1, customFilters = null) => {
    try {
      setLoading(true);
      setNoEmpCodeMessage(null);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('per_page', pagination.per_page);
      
      // Use custom filters if provided, otherwise use state filters
      const activeFilters = customFilters || filters;
      
      if (activeFilters.start_date) params.append('start_date', activeFilters.start_date);
      if (activeFilters.end_date) params.append('end_date', activeFilters.end_date);
      if (activeFilters.department) params.append('department', activeFilters.department);
      if (activeFilters.emp_code) params.append('emp_code', activeFilters.emp_code);
      if (activeFilters.search) params.append('search', activeFilters.search);
      params.append('source', attendanceSource);
      
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
      params.append('source', attendanceSource);
      
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

  const handleFormatChange = (format) => {
    setUploadFormat(format);
    setSelectedFile(null);
    setUploadResult(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (uploadFormat === 'biometric') {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
          toast.error('Biometric report format requires an Excel file (.xlsx or .xls)');
          return;
        }
      } else {
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

    if (uploadFormat === 'biometric' && !biometricPeriodStart) {
      toast.error('Please select the period start date for the biometric report');
      return;
    }
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      let uploadEndpoint = '/attendance/upload';
      if (uploadFormat === 'biometric') {
        uploadEndpoint = '/attendance/upload-biometric';
        formData.append('period_start', biometricPeriodStart);
      }
      
      const response = await api.post(uploadEndpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setUploadResult(response.data);
      toast.success(`Import completed: ${response.data.imported} imported, ${response.data.updated} updated`);
      
      // Reset filters to show latest data (today's date range)
      const today = new Date().toISOString().split('T')[0];
      const newFilters = {
        ...filters,
        start_date: today,
        end_date: today
      };
      setFilters(newFilters);
      
      // Refresh data immediately with new filters
      fetchAttendance(1, newFilters);
      fetchStatistics();
      
      // Auto-close modal after 2 seconds if import was successful
      if (response.data.imported > 0 || response.data.updated > 0) {
        setTimeout(() => {
          setShowUploadModal(false);
          setSelectedFile(null);
          setUploadResult(null);
        }, 2000);
      }
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

  const handleEdit = (record) => {
    setEditingRecord(record);
    setEditForm({
      in_time: record.in_time ? record.in_time.substring(0, 5) : '',
      out_time: record.out_time ? record.out_time.substring(0, 5) : ''
    });
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
    setEditForm({ in_time: '', out_time: '' });
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    
    try {
      await api.put(`/attendance/${editingRecord.id}`, {
        in_time: editForm.in_time || null,
        out_time: editForm.out_time || null
      });
      toast.success('Attendance record updated');
      setEditingRecord(null);
      setEditForm({ in_time: '', out_time: '' });
      fetchAttendance(pagination.current_page);
      fetchStatistics();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update attendance record');
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
  
  // Calculate working hours from in_time and out_time
  const calculateWorkingHours = (inTime, outTime) => {
    if (!inTime || !outTime) return null;
    
    const [inH, inM] = inTime.split(':').map(Number);
    const [outH, outM] = outTime.split(':').map(Number);
    
    let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return { hours, minutes, totalMinutes };
  };
  
  // Format working hours for display
  const formatWorkingHours = (inTime, outTime) => {
    const result = calculateWorkingHours(inTime, outTime);
    if (!result) return '-';
    return `${result.hours}h ${result.minutes}m`;
  };
  
  // Get status badge based on check-in time
  const getTimeStatus = (inTime) => {
    if (!inTime) return null;
    const [hours, minutes] = inTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    
    // Before 9:00 AM - Early
    if (totalMinutes < 9 * 60) {
      return { label: 'Early', color: 'bg-blue-100 text-blue-700' };
    }
    // 9:00 - 9:15 AM - On Time
    if (totalMinutes <= 9 * 60 + 15) {
      return { label: 'On Time', color: 'bg-green-100 text-green-700' };
    }
    // After 9:15 AM - Late
    return { label: 'Late', color: 'bg-orange-100 text-orange-700' };
  };
  
  // Export attendance data to CSV
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.department) params.append('department', filters.department);
      if (filters.emp_code) params.append('emp_code', filters.emp_code);
      
      const response = await api.get(`/attendance/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = `attendance_${filters.start_date || 'all'}_to_${filters.end_date || 'all'}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Attendance exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export attendance');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-7 h-7 text-red-600" />
            {isRegularEmployee ? 'My Attendance' : 'Attendance Management'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isRegularEmployee 
              ? 'View your attendance records and working hours' 
              : 'View, manage, and upload employee attendance records'}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {canUpload && (
            <>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all hover:shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all hover:shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Template</span>
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-sm hover:shadow-md"
              >
                <Upload className="w-4 h-4" />
                Upload Excel
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Attendance Source Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { key: 'all', label: 'All Records', icon: Clock },
          { key: 'upload', label: 'Biometric / Upload', icon: FileSpreadsheet },
          { key: 'gps', label: 'GPS Attendance', icon: MapPin },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setAttendanceSource(key);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              attendanceSource === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Quick Date Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-500 flex items-center mr-2">
          <CalendarDays className="w-4 h-4 mr-1" />
          Quick Filter:
        </span>
        {[
          { key: 'today', label: 'Today', icon: Sun },
          { key: 'yesterday', label: 'Yesterday', icon: Moon },
          { key: 'thisWeek', label: 'This Week', icon: Calendar },
          { key: 'thisMonth', label: 'This Month', icon: CalendarDays },
          { key: 'lastMonth', label: 'Last Month', icon: CalendarDays },
          { key: 'last3Months', label: 'Last 3 Months', icon: TrendingUp },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => applyQuickFilter(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeQuickFilter === key
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-700">{statistics.total_records}</p>
                <p className="text-sm text-blue-600 font-medium">Total Records</p>
              </div>
              <div className="w-12 h-12 bg-blue-200/50 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-700">{statistics.unique_employees}</p>
                <p className="text-sm text-green-600 font-medium">Unique Employees</p>
              </div>
              <div className="w-12 h-12 bg-green-200/50 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-purple-700">{statistics.departments?.length || 0}</p>
                <p className="text-sm text-purple-600 font-medium">Departments</p>
              </div>
              <div className="w-12 h-12 bg-purple-200/50 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-amber-700">
                  {filters.start_date && filters.end_date ? (
                    Math.ceil((new Date(filters.end_date) - new Date(filters.start_date)) / (1000 * 60 * 60 * 24)) + 1
                  ) : '-'}
                </p>
                <p className="text-sm text-amber-600 font-medium">Days in Range</p>
              </div>
              <div className="w-12 h-12 bg-amber-200/50 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-amber-700" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Advanced Filters</span>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isRegularEmployee ? 'lg:grid-cols-3' : 'lg:grid-cols-5'} gap-4`}>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => {
                  setFilters({ ...filters, start_date: e.target.value });
                  setActiveQuickFilter(null);
                }}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => {
                  setFilters({ ...filters, end_date: e.target.value });
                  setActiveQuickFilter(null);
                }}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          
          {!isRegularEmployee && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Department</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by department"
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">Employee Code</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by emp code"
                    value={filters.emp_code}
                    onChange={(e) => setFilters({ ...filters, emp_code: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </>
          )}
          
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all shadow-sm hover:shadow-md"
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
                setActiveQuickFilter(null);
                // Trigger search with cleared filters
                setTimeout(() => {
                  fetchAttendance(1);
                  fetchStatistics();
                }, 0);
              }}
              className="px-3 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
              title="Clear all filters"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header Info */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {loading ? 'Loading...' : `${pagination.total} records found`}
            </span>
          </div>
          {filters.start_date && filters.end_date && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {new Date(filters.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(filters.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
        
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  {attendanceSource === 'all' && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        Source
                      </div>
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Emp Code</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                  {attendanceSource !== 'gps' && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">FP Code</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Department</th>
                  {(attendanceSource === 'gps' || attendanceSource === 'all') && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Branch
                      </div>
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Sun className="w-3 h-3" />
                      In
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Moon className="w-3 h-3" />
                      Out
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    <div className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      Hours
                    </div>
                  </th>
                  {(canEdit || canDelete) && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendances.map((record, index) => {
                  const timeStatus = getTimeStatus(record.in_time);
                  const workingHours = calculateWorkingHours(record.in_time, record.out_time);
                  
                  return (
                    <tr 
                      key={record.id} 
                      className={`hover:bg-gray-50/80 transition-colors ${
                        editingRecord?.id === record.id ? 'bg-yellow-50 ring-2 ring-yellow-200 ring-inset' : 
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {new Date(record.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(record.date).getFullYear()}
                        </div>
                      </td>
                      {attendanceSource === 'all' && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {record.is_gps ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                              <MapPin className="w-3 h-3" />
                              GPS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              <FileSpreadsheet className="w-3 h-3" />
                              Upload
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 rounded-lg text-sm font-mono font-semibold border border-blue-200">
                          {record.emp_code || (record.is_gps ? <span className="text-gray-400 italic text-xs">GPS</span> : '-')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.employee_name || <span className="text-gray-400 italic">Unknown</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {timeStatus && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${timeStatus.color}`}>
                              {timeStatus.label}
                            </span>
                          )}
                          {record.is_gps && record.is_late && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                              Late {record.late_minutes || record.late_by_minutes ? `${record.late_minutes || record.late_by_minutes}m` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      {attendanceSource !== 'gps' && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                          {record.fp_code || <span className="text-gray-300">-</span>}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {record.dept_name || '-'}
                        </span>
                      </td>
                      {(attendanceSource === 'gps' || attendanceSource === 'all') && (
                        <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                          {record.is_gps && record.branch_name ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium border border-emerald-200">
                              <MapPin className="w-3 h-3" />
                              {record.branch_name}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-sm">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editingRecord?.id === record.id ? (
                          <input
                            type="time"
                            value={editForm.in_time}
                            onChange={(e) => setEditForm({ ...editForm, in_time: e.target.value })}
                            className="px-2 py-1.5 border border-yellow-400 rounded-lg text-sm w-24 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-yellow-50"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${record.is_gps ? 'bg-emerald-500' : 'bg-green-500'}`}></div>
                            <span className="text-sm font-medium text-gray-900">
                              {formatTime(record.in_time || record.check_in_timestamp)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {editingRecord?.id === record.id ? (
                          <input
                            type="time"
                            value={editForm.out_time}
                            onChange={(e) => setEditForm({ ...editForm, out_time: e.target.value })}
                            className="px-2 py-1.5 border border-yellow-400 rounded-lg text-sm w-24 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-yellow-50"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${(record.out_time || record.check_out_timestamp) ? (record.is_gps ? 'bg-emerald-500' : 'bg-red-500') : 'bg-gray-300'}`}></div>
                            <span className="text-sm font-medium text-gray-900">
                              {formatTime(record.out_time || record.check_out_timestamp)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                        {workingHours ? (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                            workingHours.totalMinutes >= 8 * 60 
                              ? 'bg-green-100 text-green-700' 
                              : workingHours.totalMinutes >= 6 * 60
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            <Timer className="w-3 h-3" />
                            {workingHours.hours}h {workingHours.minutes}m
                          </div>
                        ) : record.is_gps && record.working_hours ? (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                            parseFloat(record.working_hours) >= 8 
                              ? 'bg-green-100 text-green-700' 
                              : parseFloat(record.working_hours) >= 6
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            <Timer className="w-3 h-3" />
                            {Math.floor(parseFloat(record.working_hours))}h {Math.round((parseFloat(record.working_hours) % 1) * 60)}m
                          </div>
                        ) : (
                          <span className="text-gray-300 text-sm">-</span>
                        )}
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {editingRecord?.id === record.id ? (
                              <>
                                <button
                                  onClick={handleSaveEdit}
                                  className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                  title="Save"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                {canEdit && (
                                  <button
                                    onClick={() => handleEdit(record)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDelete(record.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50 gap-3">
            <p className="text-sm text-gray-600">
              Showing <span className="font-medium">{((pagination.current_page - 1) * pagination.per_page) + 1}</span> to <span className="font-medium">{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> records
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchAttendance(1)}
                disabled={pagination.current_page === 1}
                className="p-2 text-gray-600 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                title="First page"
              >
                <ChevronLeft className="w-4 h-4" />
                <ChevronLeft className="w-4 h-4 -ml-2" />
              </button>
              <button
                onClick={() => fetchAttendance(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="p-2 text-gray-600 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 px-2">
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => {
                  let pageNum;
                  if (pagination.last_page <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.current_page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.current_page >= pagination.last_page - 2) {
                    pageNum = pagination.last_page - 4 + i;
                  } else {
                    pageNum = pagination.current_page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => fetchAttendance(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        pagination.current_page === pageNum
                          ? 'bg-red-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => fetchAttendance(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}
                className="p-2 text-gray-600 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchAttendance(pagination.last_page)}
                disabled={pagination.current_page === pagination.last_page}
                className="p-2 text-gray-600 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                title="Last page"
              >
                <ChevronRight className="w-4 h-4" />
                <ChevronRight className="w-4 h-4 -ml-2" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Upload Attendance</h2>
                    <p className="text-red-200 text-sm">Import from Excel, CSV, or PDF</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setUploadResult(null);
                    setUploadFormat('standard');
                    setBiometricPeriodStart('');
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Format Selector */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Report Format</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleFormatChange('standard')}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 transition-all text-left ${
                      uploadFormat === 'standard'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className={`w-4 h-4 ${uploadFormat === 'standard' ? 'text-red-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-semibold ${uploadFormat === 'standard' ? 'text-red-700' : 'text-gray-700'}`}>Standard</span>
                    </div>
                    <p className="text-xs text-gray-500">Simple row-per-day format (Date, Emp Code, In, Out)</p>
                  </button>

                  <button
                    onClick={() => handleFormatChange('biometric')}
                    className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 transition-all text-left ${
                      uploadFormat === 'biometric'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${uploadFormat === 'biometric' ? 'text-red-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-semibold ${uploadFormat === 'biometric' ? 'text-red-700' : 'text-gray-700'}`}>Biometric Report</span>
                    </div>
                    <p className="text-xs text-gray-500">Device export with Person ID blocks and date columns</p>
                  </button>
                </div>
              </div>

              {/* Biometric Period Start Date */}
              {uploadFormat === 'biometric' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Report Period Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={biometricPeriodStart}
                      onChange={(e) => setBiometricPeriodStart(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">The first date shown in the report (e.g. 2026-03-26 for a late-March to April report)</p>
                </div>
              )}

              {/* File Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  selectedFile 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-red-400 hover:bg-red-50/50'
                }`}
              >
                <input
                  type="file"
                  accept={uploadFormat === 'biometric' ? '.xlsx,.xls' : '.xlsx,.xls,.csv,.pdf'}
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer block"
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto">
                        <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Click to select a file</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {uploadFormat === 'biometric' ? 'Supports .xlsx, .xls' : 'Supports .xlsx, .xls, .csv, .pdf'}
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              {/* Expected Format Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  {uploadFormat === 'standard' ? (
                    <div>
                      <p className="text-sm font-semibold text-blue-800 mb-2">Expected Column Format:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {['Date', 'Emp Code', 'Employee', 'FP Code', 'Department', 'In', 'Out'].map((col) => (
                          <span key={col} className="flex items-center gap-1 text-blue-700">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-blue-800 mb-2">Biometric Report Structure:</p>
                      <div className="space-y-1 text-xs text-blue-700">
                        {[
                          'Person ID block — one block per employee',
                          'Person ID | Employee Name | Department rows',
                          'Date row — day numbers as column headers',
                          'Check-in1 row — check-in time per day',
                          'Check-out1 row — check-out time per day',
                        ].map((line) => (
                          <p key={line} className="flex items-start gap-1.5">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Result */}
              {uploadResult && (
                <div className={`rounded-xl p-4 ${
                  uploadResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      uploadResult.success ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {uploadResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {uploadResult.message}
                      </p>
                      {uploadResult.success && (
                        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                          <div className="bg-white/60 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-green-700">{uploadResult.imported}</p>
                            <p className="text-xs text-green-600">Imported</p>
                          </div>
                          <div className="bg-white/60 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-blue-700">{uploadResult.updated}</p>
                            <p className="text-xs text-blue-600">Updated</p>
                          </div>
                          {uploadResult.skipped > 0 && (
                            <div className="bg-white/60 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-gray-700">{uploadResult.skipped}</p>
                              <p className="text-xs text-gray-600">Skipped</p>
                            </div>
                          )}
                        </div>
                      )}
                      {uploadResult.errors?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-red-800 mb-1">Errors:</p>
                          <ul className="text-xs text-red-700 space-y-0.5">
                            {uploadResult.errors.slice(0, 5).map((err, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-red-400">•</span>
                                {err}
                              </li>
                            ))}
                            {uploadResult.total_errors > 5 && (
                              <li className="text-red-500 font-medium">
                                ...and {uploadResult.total_errors - 5} more errors
                              </li>
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
                {uploadFormat === 'standard' && (
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </button>
                )}
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload File
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
