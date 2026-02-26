import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, 
  Search,
  Filter,
  Download,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Building,
  Clock,
  Eye,
  X,
  RefreshCw,
  FileText,
  Check,
  AlertCircle,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import { leaveAPI, departmentAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/Toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LeaveBalances() {
  const { user } = useAuthStore();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 20
  });

  // UI States
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef(null);

  // Filters
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilterMode, setDateFilterMode] = useState('period'); // 'period' or 'range'

  const isAdmin = user?.role_id === 1 || user?.is_super_admin || user?.role === 'admin';
  const isHR = user?.department_id === 12;
  const canAccess = isAdmin || isHR;

  useEffect(() => {
    if (canAccess) {
      fetchDepartments();
    }
  }, [canAccess]);

  useEffect(() => {
    if (canAccess) {
      fetchBalances();
    }
  }, [yearFilter, monthFilter, departmentFilter, searchTerm, startDate, endDate, dateFilterMode, pagination.currentPage]);

  const fetchDepartments = async () => {
    try {
      const res = await departmentAPI.getAllDepartments();
      setDepartments(res.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.currentPage,
        per_page: pagination.perPage
      };

      // Use date range if in range mode and dates are set
      if (dateFilterMode === 'range' && startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      } else {
        // Use year/month filter
        params.year = yearFilter;
        if (monthFilter) params.month = monthFilter;
      }

      if (departmentFilter !== 'all') params.department_id = departmentFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await leaveAPI.getAllBalances(params);
      setBalances(res.data.data || []);
      setSummary(res.data.summary || null);
      setPagination({
        currentPage: res.data.pagination?.current_page || 1,
        lastPage: res.data.pagination?.last_page || 1,
        total: res.data.pagination?.total || 0,
        perPage: res.data.pagination?.per_page || 20
      });
    } catch (error) {
      console.error('Error fetching balances:', error);
      toast.error('Failed to load leave balances');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      fetchBalances();
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.lastPage) {
      setPagination(prev => ({ ...prev, currentPage: page }));
    }
  };

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prepare export data
  const getExportData = () => {
    const data = [];
    const dataToExport = filteredBalances.length > 0 ? filteredBalances : balances;
    
    dataToExport.forEach(employee => {
      if (employee.leave_balances && employee.leave_balances.length > 0) {
        employee.leave_balances.forEach((balance, index) => {
          data.push({
            'Emp Code': index === 0 ? employee.emp_code : '',
            'Name': index === 0 ? employee.name : '',
            'Email': index === 0 ? employee.email : '',
            'Department': index === 0 ? employee.department : '',
            'Role': index === 0 ? (employee.role?.replace('_', ' ') || '') : '',
            'Leave Type': balance.leave_type || balance.leave_type_name || 'N/A',
            'Entitled': balance.entitled_days || 0,
            'Used': balance.used_days || 0,
            'Remaining': balance.remaining_days || balance.available_days || 0,
            'No-Pay Days': index === 0 ? (employee.total_no_pay_days || 0) : ''
          });
        });
      } else {
        data.push({
          'Emp Code': employee.emp_code,
          'Name': employee.name,
          'Email': employee.email,
          'Department': employee.department,
          'Role': employee.role?.replace('_', ' ') || '',
          'Leave Type': 'No leave types',
          'Entitled': 0,
          'Used': 0,
          'Remaining': 0,
          'No-Pay Days': employee.total_no_pay_days || 0
        });
      }
    });
    return data;
  };

  const getFileName = () => {
    const dept = departmentFilter !== 'all' ? departments.find(d => d.id == departmentFilter)?.name : 'All';
    let dateStr;
    if (dateFilterMode === 'range' && startDate && endDate) {
      dateStr = `${startDate}_to_${endDate}`;
    } else {
      const month = monthFilter ? months.find(m => m.value === monthFilter)?.label : 'FullYear';
      dateStr = `${month}_${yearFilter}`;
    }
    return `Leave_Balances_${dept}_${dateStr}`.replace(/\s/g, '_');
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast.warning('No data to export');
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 12 }, // Emp Code
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 18 }, // Department
        { wch: 15 }, // Role
        { wch: 15 }, // Leave Type
        { wch: 10 }, // Entitled
        { wch: 10 }, // Used
        { wch: 10 }, // Remaining
        { wch: 12 }, // No-Pay Days
      ];
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Balances');
      XLSX.writeFile(workbook, `${getFileName()}.xlsx`);
      toast.success('Excel file exported successfully');
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export Excel file');
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    const dataToExport = filteredBalances.length > 0 ? filteredBalances : balances;
    if (dataToExport.length === 0) {
      toast.warning('No data to export');
      return;
    }

    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      
      // Title
      const dept = departmentFilter !== 'all' ? departments.find(d => d.id == departmentFilter)?.name : 'All Departments';
      let periodStr;
      if (dateFilterMode === 'range' && startDate && endDate) {
        periodStr = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
      } else {
        const month = monthFilter ? months.find(m => m.value === monthFilter)?.label : 'Full Year';
        periodStr = `${month} ${yearFilter}`;
      }
      
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Leave Balances Report', 14, 15);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Department: ${dept} | Period: ${periodStr}`, 14, 23);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 29);

      // Summary stats
      if (summary) {
        doc.setFontSize(10);
        doc.text(`Total Employees: ${summary.total_employees || 0} | Leave Days Used: ${summary.total_leave_days_used || 0} | No-Pay Days: ${summary.total_no_pay_days || 0}`, 14, 36);
      }

      // Table data
      const tableData = [];
      dataToExport.forEach(employee => {
        if (employee.leave_balances && employee.leave_balances.length > 0) {
          employee.leave_balances.forEach((balance, index) => {
            tableData.push([
              index === 0 ? employee.emp_code : '',
              index === 0 ? employee.name : '',
              index === 0 ? employee.department : '',
              balance.leave_type || balance.leave_type_name || 'N/A',
              balance.entitled_days || 0,
              balance.used_days || 0,
              balance.remaining_days || balance.available_days || 0,
              index === 0 ? (employee.total_no_pay_days || 0) : ''
            ]);
          });
        } else {
          tableData.push([
            employee.emp_code,
            employee.name,
            employee.department,
            'No leave types',
            0,
            0,
            0,
            employee.total_no_pay_days || 0
          ]);
        }
      });

      autoTable(doc, {
        startY: 42,
        head: [['Emp Code', 'Name', 'Department', 'Leave Type', 'Entitled', 'Used', 'Remaining', 'No-Pay']],
        body: tableData,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [220, 38, 38], // red-600
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // gray-50
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 45 },
          2: { cellWidth: 35 },
          3: { cellWidth: 30 },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 22, halign: 'center' },
          7: { cellWidth: 22, halign: 'center' },
        },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        doc.text('CameraLK Task Management System', 14, doc.internal.pageSize.height - 10);
      }

      doc.save(`${getFileName()}.pdf`);
      toast.success('PDF file exported successfully');
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF file');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast.warning('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => row[h]));
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${getFileName()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV file exported successfully');
    setShowExportDropdown(false);
  };

  const months = [
    { value: '', label: 'Full Year' },
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Filtered data
  const filteredBalances = useMemo(() => {
    if (balanceFilter === 'all') return balances;
    return balances.filter(emp => {
      if (balanceFilter === 'nopay') return emp.total_no_pay_days > 0;
      if (balanceFilter === 'exhausted') return emp.leave_balances?.some(b => (b.remaining_days || b.available_days || 0) <= 0);
      if (balanceFilter === 'low') return emp.leave_balances?.some(b => {
        const remaining = b.remaining_days || b.available_days || 0;
        return remaining > 0 && remaining <= 2;
      });
      return true;
    });
  }, [balances, balanceFilter]);

  // Quick stats
  const quickStats = useMemo(() => ({
    totalWithNoPay: balances.filter(e => e.total_no_pay_days > 0).length,
    totalWithLowBalance: balances.filter(e => 
      e.leave_balances?.some(b => {
        const r = b.remaining_days || b.available_days || 0;
        return r > 0 && r <= 2;
      })
    ).length,
    totalExhausted: balances.filter(e => 
      e.leave_balances?.some(b => (b.remaining_days || b.available_days || 0) <= 0)
    ).length,
  }), [balances]);

  const openDetailModal = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
  };

  const getBalanceStatus = (remaining, entitled) => {
    if (remaining <= 0) return { label: 'Exhausted', color: 'bg-red-100 text-red-700' };
    if (remaining <= 2) return { label: 'Low', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Good', color: 'bg-green-100 text-green-700' };
  };

  if (!canAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md">
          <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Restricted</h2>
          <p className="text-gray-500">This page is only accessible to Admin and HR personnel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-black">Leave Balances</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor employee leave allocation and usage</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{summary?.total_employees || 0}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium">Days Used</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{summary?.total_leave_days_used || 0}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">No-Pay Days</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{summary?.total_no_pay_days || 0}</p>
        </div>
        <button 
          onClick={() => setBalanceFilter(balanceFilter === 'nopay' ? 'all' : 'nopay')}
          className={`text-left rounded-xl p-4 border transition-all ${
            balanceFilter === 'nopay' 
              ? 'bg-red-100 border-red-400 ring-2 ring-red-200' 
              : 'bg-orange-50 border-orange-100 hover:border-orange-200'
          }`}
        >
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Has No-Pay</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">{quickStats.totalWithNoPay}</p>
        </button>
        <button 
          onClick={() => setBalanceFilter(balanceFilter === 'low' ? 'all' : 'low')}
          className={`text-left rounded-xl p-4 border transition-all ${
            balanceFilter === 'low' 
              ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-200' 
              : 'bg-yellow-50 border-yellow-100 hover:border-yellow-200'
          }`}
        >
          <div className="flex items-center gap-2 text-yellow-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Low Balance</span>
          </div>
          <p className="text-2xl font-bold text-yellow-700">{quickStats.totalWithLowBalance}</p>
        </button>
        <button 
          onClick={() => setBalanceFilter(balanceFilter === 'exhausted' ? 'all' : 'exhausted')}
          className={`text-left rounded-xl p-4 border transition-all ${
            balanceFilter === 'exhausted' 
              ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-200' 
              : 'bg-purple-50 border-purple-100 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <X className="w-4 h-4" />
            <span className="text-xs font-medium">Exhausted</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{quickStats.totalExhausted}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, code, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => { setDepartmentFilter(e.target.value); setPagination(prev => ({ ...prev, currentPage: 1 })); }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          
          {/* Date Filter Mode Toggle */}
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => { setDateFilterMode('period'); setPagination(prev => ({ ...prev, currentPage: 1 })); }}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                dateFilterMode === 'period' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Period
            </button>
            <button
              onClick={() => { setDateFilterMode('range'); setPagination(prev => ({ ...prev, currentPage: 1 })); }}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                dateFilterMode === 'range' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Date Range
            </button>
          </div>

          {/* Period Filter (Year/Month) */}
          {dateFilterMode === 'period' && (
            <>
              <select
                value={monthFilter}
                onChange={(e) => { setMonthFilter(e.target.value); setPagination(prev => ({ ...prev, currentPage: 1 })); }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setYearFilter(yearFilter - 1); setPagination(prev => ({ ...prev, currentPage: 1 })); }}
                  className="p-1.5 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium">{yearFilter}</span>
                <button
                  onClick={() => { setYearFilter(yearFilter + 1); setPagination(prev => ({ ...prev, currentPage: 1 })); }}
                  className="p-1.5 hover:bg-gray-100 rounded"
                  disabled={yearFilter >= currentYear}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {/* Date Range Filter */}
          {dateFilterMode === 'range' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-500">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPagination(prev => ({ ...prev, currentPage: 1 })); }}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-500">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPagination(prev => ({ ...prev, currentPage: 1 })); }}
                  min={startDate}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); setPagination(prev => ({ ...prev, currentPage: 1 })); }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  title="Clear dates"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => fetchBalances()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
              <ChevronDown className={`w-4 h-4 transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={exportToExcel}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Export as Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                  Export as PDF
                </button>
                <button
                  onClick={exportToCSV}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  Export as CSV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {balanceFilter !== 'all' && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
            <span className="text-xs text-gray-500">Active filter:</span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              balanceFilter === 'nopay' ? 'bg-orange-100 text-orange-700' :
              balanceFilter === 'low' ? 'bg-yellow-100 text-yellow-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {balanceFilter === 'nopay' ? 'Has No-Pay' : balanceFilter === 'low' ? 'Low Balance' : 'Exhausted'}
              <button onClick={() => setBalanceFilter('all')} className="ml-1 hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        <span>Showing {filteredBalances.length} of {balances.length} employees</span>
        <span>
          {dateFilterMode === 'range' && startDate && endDate 
            ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
            : `${monthFilter ? months.find(m => m.value === monthFilter)?.label : 'Full Year'} ${yearFilter}`
          }
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
          </div>
        ) : filteredBalances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No records found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Leave Balances</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">No-Pay</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBalances.map((employee) => (
                  <tr 
                    key={employee.user_id}
                    className={`hover:bg-gray-50 transition-colors ${
                      employee.total_no_pay_days > 0 ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-700">
                          {employee.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{employee.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 font-mono">{employee.emp_code}</span>
                            <span className="text-xs text-gray-400">• {employee.role?.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 text-sm">{employee.department || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {employee.leave_balances?.length > 0 ? (
                          <>
                            {employee.leave_balances.slice(0, 3).map((balance, i) => {
                              const remaining = balance.remaining_days ?? balance.available_days ?? 0;
                              const entitled = balance.entitled_days ?? 0;
                              const status = getBalanceStatus(remaining, entitled);
                              
                              return (
                                <span 
                                  key={i}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                                  title={`${balance.leave_type}: ${remaining}/${entitled} days remaining`}
                                >
                                  {balance.leave_type || 'Leave'}: {remaining}/{entitled}
                                </span>
                              );
                            })}
                            {employee.leave_balances.length > 3 && (
                              <button 
                                onClick={() => openDetailModal(employee)}
                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                +{employee.leave_balances.length - 3} more
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 italic text-sm">No leave types</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        employee.total_no_pay_days > 0 
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {employee.total_no_pay_days || 0} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openDetailModal(employee)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.lastPage > 1 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.lastPage} ({pagination.total} total)
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {Array.from({ length: Math.min(5, pagination.lastPage) }, (_, i) => {
                let pageNum;
                if (pagination.lastPage <= 5) pageNum = i + 1;
                else if (pagination.currentPage <= 3) pageNum = i + 1;
                else if (pagination.currentPage >= pagination.lastPage - 2) pageNum = pagination.lastPage - 4 + i;
                else pageNum = pagination.currentPage - 2 + i;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 text-sm font-medium rounded-lg ${
                      pagination.currentPage === pageNum
                        ? 'bg-red-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.lastPage}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowDetailModal(false)}>
          <div className="min-h-screen px-4 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50 transition-opacity"></div>
            
            <div 
              className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-lg font-medium">
                    {selectedEmployee.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedEmployee.name}</h2>
                    <p className="text-sm text-gray-500">
                      {selectedEmployee.emp_code} • {selectedEmployee.department}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xl font-bold text-blue-700">{selectedEmployee.total_leave_days || 0}</p>
                    <p className="text-xs text-blue-600 mt-1">Total Used</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-xl font-bold text-green-700">{selectedEmployee.paid_leave_days || 0}</p>
                    <p className="text-xs text-green-600 mt-1">Paid Leave</p>
                  </div>
                  <div className={`text-center p-3 rounded-lg border ${
                    selectedEmployee.total_no_pay_days > 0 
                      ? 'bg-red-50 border-red-100' 
                      : 'bg-gray-50 border-gray-100'
                  }`}>
                    <p className={`text-xl font-bold ${
                      selectedEmployee.total_no_pay_days > 0 ? 'text-red-700' : 'text-gray-700'
                    }`}>
                      {selectedEmployee.total_no_pay_days || 0}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">No-Pay Days</p>
                  </div>
                </div>

                {/* Leave Balances */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-500" />
                    Leave Balances for {yearFilter}
                  </h3>
                  <div className="space-y-3">
                    {selectedEmployee.leave_balances?.length > 0 ? (
                      selectedEmployee.leave_balances.map((balance, idx) => {
                        const remaining = balance.remaining_days ?? balance.available_days ?? 0;
                        const entitled = balance.entitled_days ?? 0;
                        const used = balance.used_days || 0;
                        const percentage = entitled > 0 ? (used / entitled) * 100 : 0;
                        
                        return (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900 text-sm">
                                {balance.leave_type || balance.leave_type_name}
                              </span>
                              <div className="flex items-center gap-2 text-sm">
                                <span className={`font-bold ${
                                  remaining <= 0 ? 'text-red-600' : remaining <= 2 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                  {remaining} remaining
                                </span>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-500">{entitled} total</span>
                              </div>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between mt-1.5 text-xs text-gray-500">
                              <span>Used: {used} days</span>
                              <span>Pending: {balance.pending_days || 0} days</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-400 text-center py-4">No leave types assigned</p>
                    )}
                  </div>
                </div>

                {/* No-Pay Records */}
                {selectedEmployee.no_pay_leaves?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      No-Pay Leave Records
                    </h3>
                    <div className="space-y-2">
                      {selectedEmployee.no_pay_leaves.map((leave, idx) => (
                        <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-100">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-red-800 text-sm">{leave.leave_type}</span>
                            <span className="text-sm font-bold text-red-600">{leave.total_days} days</span>
                          </div>
                          <p className="text-xs text-red-600 mt-1">
                            {leave.start_date} → {leave.end_date}
                          </p>
                          {leave.reason && (
                            <p className="text-xs text-gray-600 mt-2 italic bg-white px-2 py-1.5 rounded">
                              "{leave.reason}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
