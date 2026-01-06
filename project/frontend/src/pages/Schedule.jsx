import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Edit2, 
  Trash2, 
  X,
  Repeat,
  List,
  Grid3X3,
  FileText,
  Clock,
  CheckCircle,
  Eye,
  ListTodo,
  CheckSquare,
  Square,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { scheduledPlanAPI, departmentAPI, planDailyEntryAPI } from '../services/api';
import useAuthStore from '../store/authStore';

export default function Schedule() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDepartment = searchParams.get('department') || 'all';
  
  const [plans, setPlans] = useState([]);
  const [calendarData, setCalendarData] = useState({});
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [departmentFilter, setDepartmentFilter] = useState(initialDepartment);
  
  // Multi-day selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);

  // Daily entry state (To-Do and Done tracking)
  const [dailyEntries, setDailyEntries] = useState({}); // { planId_date: { todo_items: [], done_items: [], daily_notes: '' } }
  const [loadingEntries, setLoadingEntries] = useState({});
  const [editingEntry, setEditingEntry] = useState(null); // { planId, date }
  const [entryFormData, setEntryFormData] = useState({ todo_items: [], done_items: [], daily_notes: '' });
  const [newTodoItem, setNewTodoItem] = useState('');
  const [newDoneItem, setNewDoneItem] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department_id: '',
    start_date: '',
    end_date: '',
    notes: '',
    is_recurring: false,
    recurrence_pattern: '',
    recurrence_end_date: ''
  });

  const canManageSchedule = user?.role === 'super_admin' || user?.role === 'dept_admin';

  useEffect(() => {
    fetchData();
  }, [currentDate, departmentFilter]);

  // Load daily entries when day modal opens
  useEffect(() => {
    if (showDayModal && selectedDate) {
      const dayPlans = calendarData[selectedDate] || [];
      dayPlans.forEach(plan => {
        const key = `${plan.id}_${selectedDate}`;
        if (!dailyEntries[key] && !loadingEntries[key]) {
          fetchDailyEntry(plan.id, selectedDate);
        }
      });
    }
  }, [showDayModal, selectedDate, calendarData]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const [calendarRes, deptsRes] = await Promise.all([
        scheduledPlanAPI.getCalendar(year, month, departmentFilter !== 'all' ? departmentFilter : null),
        departmentAPI.getAllDepartments()
      ]);

      const calendarPlans = calendarRes.data.plans || {};
      setCalendarData(calendarPlans);
      setDepartments(deptsRes.data || []);

      // Fetch list view data
      const lastDay = new Date(year, month, 0).getDate();
      const listRes = await scheduledPlanAPI.getAll({
        start_date: `${year}-${String(month).padStart(2, '0')}-01`,
        end_date: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
        department_id: departmentFilter !== 'all' ? departmentFilter : undefined
      });
      
      const plansData = Array.isArray(listRes.data) ? listRes.data : (listRes.data?.data || []);
      setPlans(plansData);

      // Fetch daily entries for all plans to show To-Do items on calendar
      const allPlanIds = new Set();
      Object.values(calendarPlans).forEach(dayPlans => {
        dayPlans.forEach(plan => allPlanIds.add(plan.id));
      });

      // Fetch all entries for each plan
      const entriesPromises = Array.from(allPlanIds).map(async (planId) => {
        try {
          const entriesRes = await planDailyEntryAPI.getAll(planId);
          return { planId, entries: entriesRes.data || [] };
        } catch (err) {
          return { planId, entries: [] };
        }
      });

      const entriesResults = await Promise.all(entriesPromises);
      
      // Build dailyEntries map
      const newDailyEntries = { ...dailyEntries };
      entriesResults.forEach(({ planId, entries }) => {
        if (Array.isArray(entries)) {
          entries.forEach(entry => {
            const entryDate = entry.entry_date || entry.date;
            const key = `${planId}_${entryDate}`;
            newDailyEntries[key] = entry;
          });
        }
      });
      setDailyEntries(newDailyEntries);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultDepartmentId = () => {
    // If department is pre-selected from URL, use that
    if (initialDepartment && initialDepartment !== 'all') {
      return initialDepartment;
    }
    if (user?.role === 'dept_admin') {
      const managedIds = (user.managed_department_ids || [])
        .map(id => Number(id))
        .filter(id => Number.isFinite(id) && id > 0);
      if (managedIds.length > 0) return managedIds[0];
    }
    return user?.department_id || (departments[0]?.id || '');
  };

  // Check if department is pre-selected from URL (e.g., from Department Details page)
  const isDepartmentPreSelected = initialDepartment && initialDepartment !== 'all';

  const handleOpenCreateModal = (startDate = null, endDate = null) => {
    const defaultDeptId = getDefaultDepartmentId();
    setFormData({
      title: '',
      description: '',
      department_id: defaultDeptId,
      start_date: startDate || new Date().toISOString().split('T')[0],
      end_date: endDate || '',
      notes: '',
      is_recurring: false,
      recurrence_pattern: '',
      recurrence_end_date: ''
    });
    // Clear selection after opening modal
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectedDates([]);
    setShowCreateModal(true);
  };

  // Multi-day selection handlers
  const handleDayMouseDown = (dateKey, e) => {
    e.preventDefault();
    
    // For employees, just allow single click to view plans
    if (!canManageSchedule) {
      const dayPlans = calendarData[dateKey] || [];
      if (dayPlans.length > 0) {
        setSelectedDate(dateKey);
        setShowDayModal(true);
      }
      return;
    }
    
    // For admins, enable multi-day selection
    setIsSelecting(true);
    setSelectionStart(dateKey);
    setSelectionEnd(dateKey);
    setSelectedDates([dateKey]);
  };

  const handleDayMouseEnter = (dateKey) => {
    if (!isSelecting || !selectionStart) return;
    setSelectionEnd(dateKey);
    // Calculate all dates between start and current
    const dates = getDatesBetween(selectionStart, dateKey);
    setSelectedDates(dates);
  };

  const handleDayMouseUp = () => {
    if (!isSelecting) return;
    setIsSelecting(false);
    
    // If we have selected dates, show option to create plan
    if (selectedDates.length > 1) {
      // Sort dates to get start and end
      const sortedDates = [...selectedDates].sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];
      if (canManageSchedule) {
        handleOpenCreateModal(startDate, endDate);
      }
    } else if (selectedDates.length === 1) {
      // Single day click - show day modal or create modal
      const dateKey = selectedDates[0];
      const dayPlans = calendarData[dateKey] || [];
      if (dayPlans.length > 0) {
        // Has plans - show day modal for all users
        setSelectedDate(dateKey);
        setShowDayModal(true);
      } else if (canManageSchedule) {
        // No plans and user can create - show create modal
        handleOpenCreateModal(dateKey);
      }
    }
  };

  const getDatesBetween = (startDateStr, endDateStr) => {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    // Swap if end is before start
    const [actualStart, actualEnd] = start <= end ? [start, end] : [end, start];
    
    const dates = [];
    const current = new Date(actualStart);
    
    while (current <= actualEnd) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const clearSelection = () => {
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectedDates([]);
  };

  const isDateSelected = (dateKey) => {
    return selectedDates.includes(dateKey);
  };

  const handleEdit = (plan) => {
    setSelectedPlan(plan);
    setFormData({
      title: plan.title,
      description: plan.description || '',
      department_id: plan.department_id,
      start_date: plan.start_date,
      end_date: plan.end_date || '',
      notes: plan.notes || '',
      is_recurring: plan.is_recurring || false,
      recurrence_pattern: plan.recurrence_pattern || '',
      recurrence_end_date: plan.recurrence_end_date || ''
    });
    setShowViewModal(false);
    setShowDayModal(false);
    setShowEditModal(true);
  };

  const handleView = (plan) => {
    setSelectedPlan(plan);
    setShowDayModal(false);
    setShowViewModal(true);
  };

  const handleDayClick = (dateKey, dayPlans) => {
    if (dayPlans.length > 0 || canManageSchedule) {
      setSelectedDate(dateKey);
      setShowDayModal(true);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      if (!submitData.end_date) delete submitData.end_date;
      if (!submitData.recurrence_pattern) delete submitData.recurrence_pattern;
      if (!submitData.recurrence_end_date) delete submitData.recurrence_end_date;

      await scheduledPlanAPI.create(submitData);
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating plan:', error);
      alert(error.response?.data?.message || 'Failed to create scheduled plan');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      if (!submitData.end_date) submitData.end_date = null;
      if (!submitData.recurrence_pattern) submitData.recurrence_pattern = null;
      if (!submitData.recurrence_end_date) submitData.recurrence_end_date = null;

      await scheduledPlanAPI.update(selectedPlan.id, submitData);
      setShowEditModal(false);
      setSelectedPlan(null);
      fetchData();
    } catch (error) {
      console.error('Error updating plan:', error);
      alert(error.response?.data?.message || 'Failed to update scheduled plan');
    }
  };

  const handleQuickUpdateNotes = async (plan, newNotes) => {
    try {
      await scheduledPlanAPI.update(plan.id, { ...plan, notes: newNotes });
      fetchData();
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  // Daily Entry (To-Do / Done) handlers
  const fetchDailyEntry = async (planId, date) => {
    const key = `${planId}_${date}`;
    setLoadingEntries(prev => ({ ...prev, [key]: true }));
    try {
      const response = await planDailyEntryAPI.getByDate(planId, date);
      setDailyEntries(prev => ({ ...prev, [key]: response.data }));
    } catch (error) {
      console.error('Error fetching daily entry:', error);
    } finally {
      setLoadingEntries(prev => ({ ...prev, [key]: false }));
    }
  };

  const startEditingEntry = (planId, date) => {
    const key = `${planId}_${date}`;
    const entry = dailyEntries[key] || { todo_items: [], done_items: [], daily_notes: '' };
    setEntryFormData({
      todo_items: entry.todo_items || [],
      done_items: entry.done_items || [],
      daily_notes: entry.daily_notes || ''
    });
    setEditingEntry({ planId, date });
    setNewTodoItem('');
    setNewDoneItem('');
  };

  const cancelEditingEntry = () => {
    setEditingEntry(null);
    setEntryFormData({ todo_items: [], done_items: [], daily_notes: '' });
    setNewTodoItem('');
    setNewDoneItem('');
  };

  const saveDailyEntry = async () => {
    if (!editingEntry) return;
    const { planId, date } = editingEntry;
    const key = `${planId}_${date}`;
    
    try {
      setLoadingEntries(prev => ({ ...prev, [key]: true }));
      const response = await planDailyEntryAPI.update(planId, date, entryFormData);
      setDailyEntries(prev => ({ ...prev, [key]: response.data.entry }));
      cancelEditingEntry();
    } catch (error) {
      console.error('Error saving daily entry:', error);
      alert(error.response?.data?.message || 'Failed to save daily entry');
    } finally {
      setLoadingEntries(prev => ({ ...prev, [key]: false }));
    }
  };

  const addTodoItem = () => {
    if (!newTodoItem.trim()) return;
    setEntryFormData(prev => ({
      ...prev,
      todo_items: [...prev.todo_items, newTodoItem.trim()]
    }));
    setNewTodoItem('');
  };

  const addDoneItem = () => {
    if (!newDoneItem.trim()) return;
    setEntryFormData(prev => ({
      ...prev,
      done_items: [...prev.done_items, newDoneItem.trim()]
    }));
    setNewDoneItem('');
  };

  const removeTodoItem = (index) => {
    setEntryFormData(prev => ({
      ...prev,
      todo_items: prev.todo_items.filter((_, i) => i !== index)
    }));
  };

  const removeDoneItem = (index) => {
    setEntryFormData(prev => ({
      ...prev,
      done_items: prev.done_items.filter((_, i) => i !== index)
    }));
  };

  const moveTodoToDone = (index) => {
    const item = entryFormData.todo_items[index];
    setEntryFormData(prev => ({
      ...prev,
      todo_items: prev.todo_items.filter((_, i) => i !== index),
      done_items: [...prev.done_items, item]
    }));
  };

  const moveDoneToTodo = (index) => {
    const item = entryFormData.done_items[index];
    setEntryFormData(prev => ({
      ...prev,
      done_items: prev.done_items.filter((_, i) => i !== index),
      todo_items: [...prev.todo_items, item]
    }));
  };

  const handleDelete = async (plan) => {
    if (!confirm('Are you sure you want to delete this scheduled plan?')) return;
    try {
      await scheduledPlanAPI.delete(plan.id);
      setShowViewModal(false);
      setShowDayModal(false);
      fetchData();
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Failed to delete scheduled plan');
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    for (let i = 0; i < startingDay; i++) {
      const prevDate = new Date(year, month, -startingDay + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getPlanColor = (plan) => {
    if (plan.is_recurring) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const formatDateDisplay = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const renderPlanForm = (isEdit = false) => (
    <form onSubmit={isEdit ? handleUpdate : handleCreate} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter plan title"
          required
        />
      </div>

      {/* Department field - hidden when pre-selected from URL */}
      {!isDepartmentPreSelected && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
          <select
            value={formData.department_id}
            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Department</option>
            {user?.role === 'super_admin' 
              ? departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))
              : departments
                  .filter(dept => {
                    const managedIds = (user?.managed_department_ids || [])
                      .map(id => Number(id))
                      .filter(id => Number.isFinite(id) && id > 0);
                    return managedIds.includes(Number(dept.id)) || Number(dept.id) === Number(user?.department_id);
                  })
                  .map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))
            }
          </select>
          {user?.role === 'dept_admin' && (
            <p className="text-xs text-gray-500 mt-1">Select from your managed departments</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
          <input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            min={formData.start_date}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty for single-day plan</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe the scheduled plan..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Updates</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add notes, progress updates, or completion status..."
        />
      </div>

      <div className="border-t pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_recurring}
            onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <Repeat className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Recurring Plan</span>
        </label>

        {formData.is_recurring && (
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Pattern</label>
              <select
                value={formData.recurrence_pattern}
                onChange={(e) => setFormData({ ...formData, recurrence_pattern: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Pattern</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Until</label>
              <input
                type="date"
                value={formData.recurrence_end_date}
                onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                min={formData.end_date || formData.start_date}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => isEdit ? setShowEditModal(false) : setShowCreateModal(false)}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {isEdit ? 'Update Plan' : 'Create Plan'}
        </button>
      </div>
    </form>
  );

  const renderDayPlans = (dateKey) => {
    const dayPlans = calendarData[dateKey] || [];
    const dateDisplay = new Date(dateKey).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const renderDailyEntrySection = (plan) => {
      const key = `${plan.id}_${dateKey}`;
      const entry = dailyEntries[key] || { todo_items: [], done_items: [], daily_notes: '' };
      const isLoading = loadingEntries[key];
      const isEditing = editingEntry?.planId === plan.id && editingEntry?.date === dateKey;

      if (isLoading) {
        return (
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-gray-500">Loading daily tasks...</span>
          </div>
        );
      }

      if (isEditing) {
        return (
          <div className="mt-4 pt-4 border-t-2 border-blue-200 bg-gradient-to-b from-blue-50 to-white rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                <ListTodo className="w-5 h-5" />
                Daily Tasks for {new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </h5>
            </div>
            
            {/* To-Do Section */}
            <div className="bg-white rounded-lg border border-orange-200 p-3">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-orange-100">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <ListTodo className="w-4 h-4 text-orange-600" />
                </div>
                <span className="font-semibold text-gray-800">To-Do List</span>
                <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                  {entryFormData.todo_items.length} items
                </span>
              </div>
              <div className="space-y-2">
                {entryFormData.todo_items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 bg-orange-50 p-2 rounded border border-orange-200">
                    <Square className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="flex-1 text-sm">{item}</span>
                    <button
                      onClick={() => moveTodoToDone(index)}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                      title="Mark as Done"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeTodoItem(index)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTodoItem}
                    onChange={(e) => setNewTodoItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTodoItem()}
                    placeholder="Type a task and press Enter..."
                    className="flex-1 text-sm px-4 py-2.5 border-2 border-dashed border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 focus:bg-orange-50 transition-colors"
                  />
                  <button
                    onClick={addTodoItem}
                    className="px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Done Section */}
            <div className="bg-white rounded-lg border border-green-200 p-3">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-100">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span className="font-semibold text-gray-800">Completed</span>
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {entryFormData.done_items.length} items
                </span>
              </div>
              <div className="space-y-2">
                {entryFormData.done_items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 bg-green-50 p-2 rounded border border-green-200">
                    <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="flex-1 text-sm line-through text-gray-600">{item}</span>
                    <button
                      onClick={() => moveDoneToTodo(index)}
                      className="p-1 text-orange-600 hover:bg-orange-100 rounded"
                      title="Move back to To-Do"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeDoneItem(index)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newDoneItem}
                    onChange={(e) => setNewDoneItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addDoneItem()}
                    placeholder="Add completed item..."
                    className="flex-1 text-sm px-4 py-2.5 border-2 border-dashed border-green-300 rounded-lg focus:outline-none focus:border-green-500 focus:bg-green-50 transition-colors"
                  />
                  <button
                    onClick={addDoneItem}
                    className="px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Notes */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-gray-600" />
                </div>
                <span className="font-semibold text-gray-800">Daily Notes</span>
              </div>
              <textarea
                value={entryFormData.daily_notes}
                onChange={(e) => setEntryFormData(prev => ({ ...prev, daily_notes: e.target.value }))}
                placeholder="Add any notes or comments for this day..."
                className="w-full text-sm p-3 border-2 border-dashed border-gray-300 rounded-lg resize-none focus:outline-none focus:border-blue-500 focus:bg-blue-50 transition-colors"
                rows={3}
              />
            </div>

            {/* Save/Cancel buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={cancelEditingEntry}
                className="flex-1 px-4 py-3 text-sm font-medium border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveDailyEntry}
                className="flex-1 px-4 py-3 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        );
      }

      // View mode (not editing)
      const hasTodos = entry.todo_items?.length > 0;
      const hasDone = entry.done_items?.length > 0;
      const hasAnyData = hasTodos || hasDone || entry.daily_notes;
      const todoCount = entry.todo_items?.length || 0;
      const doneCount = entry.done_items?.length || 0;
      const totalTasks = todoCount + doneCount;
      const progressPercent = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

      return (
        <div className="mt-4 pt-4 border-t-2 border-blue-200">
          {hasAnyData ? (
            <div className="space-y-4">
              {/* Progress Bar with Summary */}
              {totalTasks > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-bold text-blue-800 flex items-center gap-2">
                      <ListTodo className="w-5 h-5" />
                      Daily Progress
                    </h5>
                    <span className="text-lg font-bold text-blue-600">{progressPercent}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 bg-orange-100 px-3 py-1.5 rounded-full">
                      <Square className="w-4 h-4 text-orange-500" />
                      <span className="font-semibold text-orange-700">{todoCount} Pending</span>
                    </div>
                    <div className="flex items-center gap-2 bg-green-100 px-3 py-1.5 rounded-full">
                      <CheckSquare className="w-4 h-4 text-green-500" />
                      <span className="font-semibold text-green-700">{doneCount} Completed</span>
                    </div>
                  </div>
                </div>
              )}

              {/* To-Do Card */}
              {hasTodos && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border-2 border-orange-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3 pb-2 border-b border-orange-200">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow">
                      <ListTodo className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-orange-800 text-base">Pending Tasks</span>
                      <p className="text-xs text-orange-600">{todoCount} item{todoCount !== 1 ? 's' : ''} remaining</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {entry.todo_items.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-gray-800 bg-white px-4 py-3 rounded-lg border border-orange-200 shadow-sm">
                        <Square className="w-5 h-5 text-orange-400 flex-shrink-0" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Done Card */}
              {hasDone && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3 pb-2 border-b border-green-200">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-green-800 text-base">Completed Tasks</span>
                      <p className="text-xs text-green-600">{doneCount} item{doneCount !== 1 ? 's' : ''} done</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {entry.done_items.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-gray-500 bg-white px-4 py-3 rounded-lg border border-green-200 shadow-sm">
                        <CheckSquare className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="line-through font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes Section */}
              {entry.daily_notes && (
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border-2 border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3 pb-2 border-b border-gray-200">
                    <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center shadow">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-gray-800 text-base">Daily Notes</span>
                  </div>
                  <p className="text-sm text-gray-700 bg-white p-4 rounded-lg border border-gray-200">{entry.daily_notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-dashed border-gray-300">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
                <ListTodo className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No tasks added for this day yet</p>
              {canManageSchedule && (
                <p className="text-sm text-gray-400 mt-1">Click the button below to add tasks</p>
              )}
            </div>
          )}

          {canManageSchedule && (
            <button
              onClick={() => startEditingEntry(plan.id, dateKey)}
              className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all shadow-sm ${
                hasAnyData 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-2 border-blue-300' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
              }`}
            >
              {hasAnyData ? (
                <>
                  <Edit2 className="w-5 h-5" />
                  Edit Daily Tasks
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add To-Do List
                </>
              )}
            </button>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between sticky top-0 bg-white pb-2">
          <h3 className="text-lg font-semibold text-gray-900">{dateDisplay}</h3>
          <span className="text-sm text-gray-500">{dayPlans.length} plan(s)</span>
        </div>

        {dayPlans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No plans scheduled for this day</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dayPlans.map((plan) => {
              const fullPlan = plans.find(p => p.id === plan.id) || plan;
              const isMultiDay = plan.end_date && plan.start_date !== plan.end_date;
              
              return (
                <div 
                  key={plan.id} 
                  className={`p-4 rounded-lg border ${plan.is_recurring ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{plan.title}</h4>
                        {plan.is_recurring && (
                          <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                            <Repeat className="w-3 h-3" />
                            {plan.recurrence_pattern}
                          </span>
                        )}
                      </div>
                      
                      {isMultiDay && (
                        <p className="text-sm text-gray-600 mb-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatDateDisplay(plan.start_date)} - {formatDateDisplay(plan.end_date)}
                        </p>
                      )}
                      
                      {plan.description && (
                        <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-2">
                        {plan.department_name} • Created by {plan.creator_name}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleView(fullPlan)}
                        className="p-2 text-gray-500 hover:bg-white rounded-lg"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canManageSchedule && (
                        <>
                          <button
                            onClick={() => handleEdit(fullPlan)}
                            className="p-2 text-blue-600 hover:bg-white rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(fullPlan)}
                            className="p-2 text-red-500 hover:bg-white rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Daily Entry Section (To-Do / Done) */}
                  {renderDailyEntrySection(plan)}
                </div>
              );
            })}
          </div>
        )}

        {canManageSchedule && (
          <button
            onClick={() => {
              setShowDayModal(false);
              handleOpenCreateModal(dateKey);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Plan for This Day
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          {isDepartmentPreSelected && (
            <button
              onClick={() => navigate(`/dashboard/departments/${initialDepartment}`)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Department</span>
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
            <p className="text-gray-600 mt-1">
              {isDepartmentPreSelected 
                ? `Schedules for ${departments.find(d => String(d.id) === String(initialDepartment))?.name || 'Department'}`
                : 'Plan and manage department schedules'
              }
            </p>
          </div>
        </div>
        {canManageSchedule && (
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            New Plan
          </button>
        )}
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-4 py-2 transition-colors ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <Grid3X3 className="w-4 h-4" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-4 py-2 transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" />
              List
            </button>
          </div>

          {/* Today Button */}
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Today
          </button>

          {/* Department Filter - hidden when pre-selected from URL */}
          {!isDepartmentPreSelected && (user?.role === 'super_admin' || (user?.managed_department_ids?.length > 1)) && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className={`px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                user?.role === 'dept_admin' ? 'border-orange-300 bg-orange-50' : ''
              }`}
            >
              {user?.role === 'dept_admin' ? (
                // For HODs, show "All My Departments" and only their managed departments
                <>
                  <option value="all">All My Departments</option>
                  {departments
                    .filter(d => {
                      const managedIds = (user.managed_department_ids || [])
                        .map(id => Number(id))
                        .filter(id => Number.isFinite(id) && id > 0);
                      return managedIds.includes(Number(d.id)) || Number(d.id) === Number(user.department_id);
                    })
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))
                  }
                </>
              ) : (
                // For super_admin, show all departments
                <>
                  <option value="all">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </>
              )}
            </select>
          )}
          {/* Show department name when pre-selected */}
          {isDepartmentPreSelected && (
            <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700">
              {departments.find(d => String(d.id) === String(initialDepartment))?.name || 'Department'}
            </div>
          )}

          {/* Legend */}
          <div className="ml-auto flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
              Regular
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200"></div>
              Recurring
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Multi-day Selection Tip */}
          {canManageSchedule && (
            <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-600">
                <span className="font-medium text-blue-700">Tip:</span> Click and drag across multiple days to create a plan spanning those dates
              </span>
            </div>
          )}
          
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {dayNames.map(day => (
              <div key={day} className="py-3 text-center text-sm font-semibold text-gray-600 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div 
            className="grid grid-cols-7"
            onMouseLeave={() => {
              if (isSelecting) {
                clearSelection();
              }
            }}
          >
            {getDaysInMonth(currentDate).map((day, index) => {
              const dateKey = formatDateKey(day.date);
              const dayPlans = calendarData[dateKey] || [];
              const hasPlans = dayPlans.length > 0;
              const isSelected = isDateSelected(dateKey);

              return (
                <div
                  key={index}
                  onMouseDown={(e) => handleDayMouseDown(dateKey, e)}
                  onMouseEnter={() => handleDayMouseEnter(dateKey)}
                  onMouseUp={handleDayMouseUp}
                  className={`min-h-[130px] p-2 border-r border-b last:border-r-0 transition-colors cursor-pointer select-none
                    ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50'}
                    ${isToday(day.date) ? 'bg-blue-50' : ''}
                    ${isSelected ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday(day.date) ? 'bg-blue-600 text-white' : ''}
                      ${!day.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
                      ${isSelected && !isToday(day.date) ? 'bg-blue-500 text-white' : ''}
                    `}>
                      {day.date.getDate()}
                    </span>
                    {hasPlans && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{dayPlans.length}</span>
                    )}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    {dayPlans.slice(0, 3).map((plan, i) => {
                      const entryKey = `${plan.id}_${dateKey}`;
                      const entry = dailyEntries[entryKey];
                      const todoCount = entry?.todo_items?.length || 0;
                      const doneCount = entry?.done_items?.length || 0;
                      
                      return (
                        <div key={i} className="group">
                          <div
                            className={`text-xs px-2 py-1.5 rounded-md truncate font-medium shadow-sm ${
                              plan.is_recurring 
                                ? 'bg-purple-500 text-white border border-purple-600' 
                                : 'bg-blue-500 text-white border border-blue-600'
                            }`}
                            title={plan.title}
                          >
                            {plan.is_recurring && <Repeat className="w-3 h-3 inline mr-1" />}
                            {plan.title}
                          </div>
                          {(todoCount > 0 || doneCount > 0) && (
                            <div className="flex items-center gap-2 px-1 mt-0.5 text-xs">
                              {todoCount > 0 && (
                                <span className="flex items-center gap-0.5 text-orange-600 font-medium">
                                  <Square className="w-3 h-3" />
                                  {todoCount}
                                </span>
                              )}
                              {doneCount > 0 && (
                                <span className="flex items-center gap-0.5 text-green-600 font-medium">
                                  <CheckSquare className="w-3 h-3" />
                                  {doneCount}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {dayPlans.length > 3 && (
                      <div className="text-xs text-blue-600 font-semibold px-1 bg-blue-50 rounded py-0.5 text-center">
                        +{dayPlans.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selection Info Bar */}
          {selectedDates.length > 1 && (
            <div className="p-3 bg-blue-50 border-t border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-800 font-medium">
                  {selectedDates.length} days selected ({selectedDates.sort()[0]} to {selectedDates.sort()[selectedDates.length - 1]})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const sortedDates = [...selectedDates].sort();
                    handleOpenCreateModal(sortedDates[0], sortedDates[sortedDates.length - 1]);
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Create Plan for {selectedDates.length} Days
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <CalendarIcon className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No scheduled plans found</p>
              <p className="text-sm text-gray-400 mb-4">Plans for {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
              {canManageSchedule && (
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create your first plan
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {plans.map(plan => {
                const isMultiDay = plan.end_date && plan.start_date !== plan.end_date;
                
                return (
                  <div 
                    key={plan.id} 
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleView(plan)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {plan.is_recurring && (
                            <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                              <Repeat className="w-3 h-3" />
                              {plan.recurrence_pattern}
                            </span>
                          )}
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {plan.department_name}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900">{plan.title}</h3>
                        {plan.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{plan.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {formatDateDisplay(plan.start_date)}
                            {isMultiDay && <> → {formatDateDisplay(plan.end_date)}</>}
                          </span>
                          {plan.notes && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              Has notes
                            </span>
                          )}
                        </div>
                      </div>
                      {canManageSchedule && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEdit(plan)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(plan)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">Create New Plan</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {renderPlanForm(false)}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">Edit Plan</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {renderPlanForm(true)}
            </div>
          </div>
        </div>
      )}

      {/* Day Detail Modal */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">Day Plans</h2>
              <button onClick={() => setShowDayModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {renderDayPlans(selectedDate)}
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">Plan Details</h2>
              <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedPlan.is_recurring && (
                  <span className="flex items-center gap-1 text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                    <Repeat className="w-4 h-4" />
                    Repeats {selectedPlan.recurrence_pattern}
                  </span>
                )}
                <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  {selectedPlan.department_name}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedPlan.title}</h3>
              
              {selectedPlan.description && (
                <p className="text-gray-600 mb-4">{selectedPlan.description}</p>
              )}

              <div className="space-y-3 text-gray-600">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-gray-400" />
                  <span>
                    {new Date(selectedPlan.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    {selectedPlan.end_date && selectedPlan.start_date !== selectedPlan.end_date && (
                      <> → {new Date(selectedPlan.end_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</>
                    )}
                  </span>
                </div>

                {selectedPlan.is_recurring && selectedPlan.recurrence_end_date && (
                  <div className="flex items-center gap-2">
                    <Repeat className="w-5 h-5 text-purple-500" />
                    <span className="text-sm text-gray-500">Until {new Date(selectedPlan.recurrence_end_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {selectedPlan.notes && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-green-800">Notes / Updates</h4>
                  </div>
                  <p className="text-green-700 text-sm whitespace-pre-wrap">{selectedPlan.notes}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t text-sm text-gray-400">
                <p>Created by {selectedPlan.creator_name}</p>
              </div>

              {canManageSchedule && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => handleEdit(selectedPlan)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedPlan)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
