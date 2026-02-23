import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import {
  getBranches,
  getDailyReport,
  getMonthlyReport,
  exportReportExcel,
  exportReportPdf,
} from '../services/gpsAttendanceService';
import {
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ArrowPathIcon,
  FunnelIcon,
  TableCellsIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

const AttendanceReports = () => {
  const { user } = useAuthStore();
  
  // Filter state
  const [reportType, setReportType] = useState('daily'); // daily, monthly, employee
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Data state
  const [branches, setBranches] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [showLocations, setShowLocations] = useState(false);
  const [includeLocationsInExport, setIncludeLocationsInExport] = useState(false);

  // Load branches on mount
  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const data = await getBranches({ status: 'active' });
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      if (reportType === 'daily') {
        data = await getDailyReport({
          date: selectedDate,
          branch_id: selectedBranch || undefined,
        });
      } else if (reportType === 'monthly') {
        data = await getMonthlyReport({
          month: selectedMonth,
          year: selectedYear,
          branch_id: selectedBranch || undefined,
        });
      }
      
      setReportData(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      
      const params = {
        type: reportType,
        branch_id: selectedBranch || undefined,
        include_locations: includeLocationsInExport ? '1' : '0',
      };
      
      if (reportType === 'daily') {
        params.date = selectedDate;
      } else {
        params.month = selectedMonth;
        params.year = selectedYear;
      }
      
      let blob;
      let extension;
      
      if (format === 'excel') {
        blob = await exportReportExcel(params);
        extension = 'xlsx';
      } else if (format === 'pdf') {
        blob = await exportReportPdf(params);
        extension = 'pdf';
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${reportType}_${selectedDate || `${selectedYear}-${selectedMonth}`}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  // Helper to format coordinates for display
  const formatLocation = (lat, lng) => {
    if (!lat || !lng) return null;
    return `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
  };
  // Helper to open location in Google Maps
  const openInMaps = (lat, lng) => {
    if (!lat || !lng) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'early_leave': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1>
        <p className="text-gray-600 mt-1">View and export attendance data for payroll processing</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Report Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Daily Report</option>
              <option value="monthly">Monthly Report</option>
            </select>
          </div>

          {/* Showroom Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Showroom</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Showrooms</option>
              {Array.isArray(branches) && branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          {reportType === 'daily' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <option key={selectedYear - 2 + i} value={selectedYear - 2 + i}>
                      {selectedYear - 2 + i}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              onClick={loadReport}
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center"
            >
              {loading ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <ChartBarIcon className="h-5 w-5 mr-2" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      {reportData && (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center">
                <DocumentArrowDownIcon className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-gray-700 font-medium">Export Report</span>
              </div>
              
              {/* Location toggles - only for daily reports */}
              {reportType === 'daily' && (
                <div className="flex items-center gap-4 border-l pl-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLocations}
                      onChange={(e) => setShowLocations(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      <MapPinIcon className="h-4 w-4 inline mr-1" />
                      Show Locations
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLocationsInExport}
                      onChange={(e) => setIncludeLocationsInExport(e.target.checked)}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Include Locations in Export
                    </span>
                  </label>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport('excel')}
                disabled={exporting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center"
              >
                <TableCellsIcon className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Excel (.xlsx)'}
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 flex items-center"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {reportData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <UsersIcon className="h-8 w-8 text-blue-500" />
              <span className="text-2xl font-bold text-gray-900">{reportData.summary.total_employees || 0}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Total Employees</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{reportData.summary.present || 0}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Present</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <ClockIcon className="h-8 w-8 text-yellow-500" />
              <span className="text-2xl font-bold text-yellow-600">{reportData.summary.late || 0}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Late</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <XCircleIcon className="h-8 w-8 text-red-500" />
              <span className="text-2xl font-bold text-red-600">{reportData.summary.absent || 0}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Absent</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600">{reportData.summary.early_leave || 0}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Early Leave</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <ChartBarIcon className="h-8 w-8 text-purple-500" />
              <span className="text-2xl font-bold text-purple-600">{reportData.summary.attendance_rate?.toFixed(1) || 0}%</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Attendance Rate</p>
          </div>
        </div>
      )}

      {/* Report Table */}
      {reportData?.records && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  {reportType === 'daily' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check In
                      </th>
                      {showLocations && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Check In Location
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check Out
                      </th>
                      {showLocations && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Check Out Location
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Working Hours
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Present Days
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Late Days
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Absent Days
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Hours
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(reportData.records) && reportData.records.map((record, index) => (
                  <tr key={record.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          {record.employee?.profile_picture ? (
                            <img src={record.employee.profile_picture} alt="" className="h-10 w-10 rounded-full" />
                          ) : (
                            <span className="text-gray-500 font-medium">
                              {record.employee?.name?.charAt(0) || '?'}
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{record.employee?.name || record.name}</div>
                          <div className="text-sm text-gray-500">{record.employee?.employee_id || record.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.branch?.name || record.branch_name || '-'}
                    </td>
                    {reportType === 'daily' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.check_in_time || record.check_in?.time || record.in_time || '-'}
                        </td>
                        {showLocations && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {(record.check_in?.latitude || record.check_in_latitude) ? (
                              <button
                                onClick={() => openInMaps(
                                  record.check_in?.latitude || record.check_in_latitude,
                                  record.check_in?.longitude || record.check_in_longitude
                                )}
                                className="flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                                title="Open in Google Maps"
                              >
                                <MapPinIcon className="h-4 w-4 mr-1" />
                                <span className="text-xs">
                                  {formatLocation(
                                    record.check_in?.latitude || record.check_in_latitude,
                                    record.check_in?.longitude || record.check_in_longitude
                                  )}
                                </span>
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.check_out_time || record.check_out?.time || record.out_time || '-'}
                        </td>
                        {showLocations && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {(record.check_out?.latitude || record.check_out_latitude) ? (
                              <button
                                onClick={() => openInMaps(
                                  record.check_out?.latitude || record.check_out_latitude,
                                  record.check_out?.longitude || record.check_out_longitude
                                )}
                                className="flex items-center text-blue-600 hover:text-blue-800 hover:underline"
                                title="Open in Google Maps"
                              >
                                <MapPinIcon className="h-4 w-4 mr-1" />
                                <span className="text-xs">
                                  {formatLocation(
                                    record.check_out?.latitude || record.check_out_latitude,
                                    record.check_out?.longitude || record.check_out_longitude
                                  )}
                                </span>
                              </button>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.working_hours || record.total_hours || '-'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {record.present_days || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                          {record.late_days || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {record.absent_days || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.total_hours || 0}h
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(record.status || record.attendance_status)}`}>
                        {(record.status || record.attendance_status || 'N/A').replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {(!reportData.records || reportData.records.length === 0) && (
            <div className="text-center py-12">
              <TableCellsIcon className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="mt-4 text-gray-500">No attendance records found for the selected criteria</p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!reportData && !loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Generate a Report</h3>
          <p className="mt-2 text-gray-500">Select your filters and click "Generate Report" to view attendance data</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;
