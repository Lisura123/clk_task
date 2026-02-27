import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Calendar,
  Settings,
  AlertCircle,
  Check,
  CalendarDays
} from 'lucide-react';
import { leaveAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';

export default function LeaveSettings() {
  const toast = useToast();
  const confirmDialog = useConfirm();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('types');
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  
  // Leave Type Modal
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    code: '',
    description: '',
    default_days_per_year: 0,
    is_paid: true,
    requires_attachment: false,
    max_consecutive_days: null,
    min_notice_days: 0,
    color: '#3B82F6'
  });
  
  // Holiday Modal
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    description: '',
    is_recurring: false
  });

  const [processing, setProcessing] = useState(false);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, [yearFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [typesRes, holidaysRes] = await Promise.all([
        leaveAPI.getLeaveTypes(),
        leaveAPI.getHolidays({ year: yearFilter })
      ]);
      setLeaveTypes(typesRes.data.data || []);
      setHolidays(holidaysRes.data.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Leave Type Functions
  const openTypeModal = (type = null) => {
    if (type) {
      setEditingType(type);
      setTypeForm({
        name: type.name,
        code: type.code,
        description: type.description || '',
        default_days_per_year: type.default_days_per_year,
        is_paid: type.is_paid,
        requires_attachment: type.requires_attachment,
        max_consecutive_days: type.max_consecutive_days || '',
        min_notice_days: type.min_notice_days || 0,
        color: type.color || '#3B82F6'
      });
    } else {
      setEditingType(null);
      setTypeForm({
        name: '',
        code: '',
        description: '',
        default_days_per_year: 0,
        is_paid: true,
        requires_attachment: false,
        max_consecutive_days: '',
        min_notice_days: 0,
        color: '#3B82F6'
      });
    }
    setShowTypeModal(true);
  };

  const handleSaveType = async () => {
    if (!typeForm.name || !typeForm.code) {
      toast.warning('Name and code are required');
      return;
    }
    
    try {
      setProcessing(true);
      const data = {
        ...typeForm,
        max_consecutive_days: typeForm.max_consecutive_days || null
      };
      
      if (editingType) {
        await leaveAPI.updateLeaveType(editingType.id, data);
        toast.success('Leave type updated successfully');
      } else {
        await leaveAPI.createLeaveType(data);
        toast.success('Leave type created successfully');
      }
      
      setShowTypeModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving leave type:', error);
      toast.error(error.response?.data?.message || 'Failed to save leave type');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteType = async (id) => {
    const confirmed = await confirmDialog.show({
      title: 'Delete Leave Type',
      message: 'Are you sure you want to delete this leave type?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;
    
    try {
      await leaveAPI.deleteLeaveType(id);
      fetchData();
      toast.success('Leave type deleted');
    } catch (error) {
      console.error('Error deleting leave type:', error);
      toast.error(error.response?.data?.message || 'Failed to delete leave type');
    }
  };

  // Holiday Functions
  const openHolidayModal = (holiday = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setHolidayForm({
        name: holiday.name,
        date: holiday.date,
        description: holiday.description || '',
        is_recurring: holiday.is_recurring
      });
    } else {
      setEditingHoliday(null);
      setHolidayForm({
        name: '',
        date: '',
        description: '',
        is_recurring: false
      });
    }
    setShowHolidayModal(true);
  };

  const handleSaveHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) {
      toast.warning('Name and date are required');
      return;
    }
    
    try {
      setProcessing(true);
      if (editingHoliday) {
        await leaveAPI.updateHoliday(editingHoliday.id, holidayForm);
        toast.success('Holiday updated successfully');
      } else {
        await leaveAPI.createHoliday(holidayForm);
        toast.success('Holiday created successfully');
      }
      
      setShowHolidayModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving holiday:', error);
      toast.error(error.response?.data?.message || 'Failed to save holiday');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    const confirmed = await confirmDialog.show({
      title: 'Delete Holiday',
      message: 'Are you sure you want to delete this holiday?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!confirmed) return;
    
    try {
      await leaveAPI.deleteHoliday(id);
      fetchData();
      toast.success('Holiday deleted');
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error(error.response?.data?.message || 'Failed to delete holiday');
    }
  };

  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black">Leave Settings</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Configure leave types and holidays</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('types')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'types'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Leave Types
        </button>
        <button
          onClick={() => setActiveTab('holidays')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === 'holidays'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDays className="w-4 h-4 inline mr-2" />
          Holidays
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
        </div>
      ) : activeTab === 'types' ? (
        // Leave Types Tab
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => openTypeModal()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Leave Type
            </button>
          </div>

          {leaveTypes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {leaveTypes.map((type) => (
                <div 
                  key={type.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div 
                    className="h-2" 
                    style={{ backgroundColor: type.color || '#3B82F6' }}
                  ></div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{type.name}</h3>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{type.code}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openTypeModal(type)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteType(type.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {type.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{type.description}</p>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Default Days</span>
                        <span className="font-medium">{type.default_days_per_year} days/year</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid Leave</span>
                        <span className={type.is_paid ? 'text-green-600' : 'text-red-600'}>
                          {type.is_paid ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Requires Attachment</span>
                        <span className={type.requires_attachment ? 'text-yellow-600' : 'text-gray-400'}>
                          {type.requires_attachment ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {type.max_consecutive_days && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Max Consecutive</span>
                          <span className="font-medium">{type.max_consecutive_days} days</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        type.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {type.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No leave types</h3>
              <p className="text-gray-600 mb-4">Create your first leave type to get started.</p>
              <button
                onClick={() => openTypeModal()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Add Leave Type
              </button>
            </div>
          )}
        </>
      ) : (
        // Holidays Tab
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setYearFilter(yearFilter - 1)}
                className="p-2 hover:bg-gray-100 rounded text-gray-600"
              >
                ←
              </button>
              <span className="font-medium text-lg">{yearFilter}</span>
              <button
                onClick={() => setYearFilter(yearFilter + 1)}
                className="p-2 hover:bg-gray-100 rounded text-gray-600"
              >
                →
              </button>
            </div>
            <button
              onClick={() => openHolidayModal()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Holiday
            </button>
          </div>

          {holidays.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holiday</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recurring</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {holidays.map((holiday) => (
                    <tr key={holiday.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(holiday.date).toLocaleDateString('en-US', { 
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{holiday.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{holiday.description || '-'}</td>
                      <td className="px-4 py-3">
                        {holiday.is_recurring ? (
                          <span className="text-green-600 text-sm">Every year</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Once</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openHolidayModal(holiday)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded mr-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(holiday.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
              <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No holidays</h3>
              <p className="text-gray-600 mb-4">Add company holidays to exclude from leave calculations.</p>
              <button
                onClick={() => openHolidayModal()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Add Holiday
              </button>
            </div>
          )}
        </>
      )}

      {/* Leave Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingType ? 'Edit Leave Type' : 'Add Leave Type'}
              </h2>
              <button
                onClick={() => setShowTypeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="e.g., Annual Leave"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input
                    type="text"
                    value={typeForm.code}
                    onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="e.g., AL"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={typeForm.description}
                  onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                  placeholder="Brief description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Days/Year</label>
                  <input
                    type="number"
                    value={typeForm.default_days_per_year}
                    onChange={(e) => setTypeForm({ ...typeForm, default_days_per_year: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Consecutive Days</label>
                  <input
                    type="number"
                    value={typeForm.max_consecutive_days}
                    onChange={(e) => setTypeForm({ ...typeForm, max_consecutive_days: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="No limit"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Notice Days</label>
                <input
                  type="number"
                  value={typeForm.min_notice_days}
                  onChange={(e) => setTypeForm({ ...typeForm, min_notice_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTypeForm({ ...typeForm, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        typeForm.color === color ? 'border-gray-800' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={typeForm.is_paid}
                    onChange={(e) => setTypeForm({ ...typeForm, is_paid: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Paid Leave</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={typeForm.requires_attachment}
                    onChange={(e) => setTypeForm({ ...typeForm, requires_attachment: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Requires Attachment (e.g., medical certificate)</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowTypeModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveType}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  {processing ? 'Saving...' : editingType ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
              </h2>
              <button
                onClick={() => setShowHolidayModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="e.g., Christmas Day"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={holidayForm.description}
                  onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="Optional description..."
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={holidayForm.is_recurring}
                  onChange={(e) => setHolidayForm({ ...holidayForm, is_recurring: e.target.checked })}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Recurring every year</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowHolidayModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveHoliday}
                  disabled={processing}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  {processing ? 'Saving...' : editingHoliday ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
