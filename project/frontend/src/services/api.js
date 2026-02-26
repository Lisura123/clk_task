import axios from 'axios';

const DEFAULT_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';
const API_BASE_URL = import.meta.env.VITE_API_URL || `${DEFAULT_ORIGIN}/api`;
const BASE_URL = (import.meta.env.VITE_API_URL?.replace(/\/?api\/?$/, '') || DEFAULT_ORIGIN).replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Get CSRF cookie before making requests
export const getCsrfCookie = () => {
  return axios.get(`${BASE_URL}/sanctum/csrf-cookie`, {
    withCredentials: true,
  });
};

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: async (credentials) => {
    await getCsrfCookie();
    return api.post('/login', credentials);
  },
  register: async (data) => {
    await getCsrfCookie();
    return api.post('/register', data);
  },
  me: () => api.get('/me'),
  changePassword: (data) => api.put('/change-password', data),
  logout: () => api.post('/logout'),
  // Admin registration management
  adminCreateEmployee: (data) => api.post('/users', data),
  getPendingRegistrations: () => api.get('/users/pending/registrations'),
  approveRegistration: (userId) => api.post(`/users/${userId}/approve`),
  rejectRegistration: (userId, reason) => api.post(`/users/${userId}/reject`, { reason }),
};

// User APIs
export const userAPI = {
  getAllUsers: (params) => api.get('/users', { params }),
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  getUsersByDepartment: (departmentId) => api.get(`/users`, { params: { department: departmentId } }),
  getByDepartment: (departmentId) => api.get(`/users`, { params: { department: departmentId } }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateProfile: (data) => api.put('/profile', data),
  getStatistics: (id) => api.get(`/users/${id}/statistics`),
};

// Department APIs
export const departmentAPI = {
  getAllDepartments: () => api.get('/departments'),
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  getStats: (id) => api.get(`/departments/${id}/statistics`),
  getEmployees: (id, params) => api.get(`/departments/${id}/employees`, { params }),
  create: (data) => api.post('/departments', data),
  createDepartment: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  updateDepartment: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),
};

// Task APIs
export const taskAPI = {
  getAllTasks: (params) => api.get('/tasks', { params }),
  getAll: (params) => api.get('/tasks', { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  getMyTasks: (params) => api.get('/tasks', { params: { ...params, my_tasks: true } }),
  getTasksByDepartment: (departmentId, params) => api.get(`/tasks`, { params: { ...params, department: departmentId } }),
  getCreatedByMe: (params) => api.get('/tasks', { params: { ...params, created_by_me: true } }),
  create: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  archive: (id) => api.post(`/tasks/${id}/archive`),
  restore: (id) => api.post(`/tasks/${id}/restore`),
  getStatistics: () => api.get('/tasks/statistics'),
  // Subtask APIs
  getSubtasks: (taskId) => api.get(`/tasks/${taskId}/subtasks`),
  createSubtask: (taskId, data) => api.post(`/tasks/${taskId}/subtasks`, data),
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: () => api.get('/tasks/statistics'),
  getSuperAdminData: () => api.get('/tasks/statistics'),
  getNotifications: () => api.get('/notifications'),
};

// Notification APIs
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear-read'),
};

// Comment APIs
export const commentAPI = {
  getByTask: (taskId) => api.get(`/tasks/${taskId}/comments`),
  create: (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),
  update: (id, data) => api.put(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
};

// Time Entry APIs
export const timeEntryAPI = {
  getByTask: (taskId) => api.get(`/tasks/${taskId}/time-entries`),
  create: (data) => api.post('/time-entries', data),
  update: (id, data) => api.put(`/time-entries/${id}`, data),
  delete: (id) => api.delete(`/time-entries/${id}`),
  getSummary: (params) => api.get('/time-entries/summary', { params }),
  startTimer: (data) => api.post('/timer/start', data),
  stopTimer: (id) => api.post(`/timer/${id}/stop`),
  getRunningTimer: () => api.get('/timer/running'),
};

// Group APIs
export const groupAPI = {
  getAll: (params) => api.get('/groups', { params }),
  getById: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post('/groups', data),
  update: (id, data) => api.put(`/groups/${id}`, data),
  delete: (id) => api.delete(`/groups/${id}`),
};

export const groupPlanAPI = {
  getMyPlans: () => api.get('/my-plans'),
  getByGroup: (groupId) => api.get(`/groups/${groupId}/plans`),
  getById: (groupId, planId) => api.get(`/groups/${groupId}/plans/${planId}`),
  create: (groupId, data) => api.post(`/groups/${groupId}/plans`, data),
  update: (groupId, planId, data) => api.put(`/groups/${groupId}/plans/${planId}`, data),
  delete: (groupId, planId) => api.delete(`/groups/${groupId}/plans/${planId}`),
};

export const groupMessageAPI = {
  getMessages: (groupId, params) => api.get(`/groups/${groupId}/messages`, { params }),
  sendMessage: (groupId, data) => api.post(`/groups/${groupId}/messages`, data),
  updateMessage: (groupId, messageId, data) => api.put(`/groups/${groupId}/messages/${messageId}`, data),
  deleteMessage: (groupId, messageId) => api.delete(`/groups/${groupId}/messages/${messageId}`),
};

export const workLogAPI = {
  getMyLogs: (params) => api.get('/my-work-logs', { params }),
  getSummary: (params) => api.get('/work-logs/summary', { params }),
  getByTask: (taskId, params) => api.get(`/tasks/${taskId}/work-logs`, { params }),
  create: (taskId, data) => api.post(`/tasks/${taskId}/work-logs`, data),
  update: (taskId, logId, data) => api.put(`/tasks/${taskId}/work-logs/${logId}`, data),
  delete: (taskId, logId) => api.delete(`/tasks/${taskId}/work-logs/${logId}`),
};

// Scheduled Plans API (Department Admin Scheduling)
export const scheduledPlanAPI = {
  getAll: (params) => api.get('/scheduled-plans', { params }),
  getCalendar: (year, month, departmentId) => api.get('/scheduled-plans/calendar', { 
    params: { year, month, department_id: departmentId } 
  }),
  getUpcoming: (limit) => api.get('/scheduled-plans/upcoming', { params: { limit } }),
  getById: (id) => api.get(`/scheduled-plans/${id}`),
  create: (data) => api.post('/scheduled-plans', data),
  update: (id, data) => api.put(`/scheduled-plans/${id}`, data),
  delete: (id) => api.delete(`/scheduled-plans/${id}`),
};

// Plan Daily Entry API (To-Do and Done tracking per day per plan)
export const planDailyEntryAPI = {
  getAll: (planId) => api.get(`/scheduled-plans/${planId}/daily-entries`),
  getByDate: (planId, date) => api.get(`/scheduled-plans/${planId}/daily-entries/${date}`),
  update: (planId, date, data) => api.put(`/scheduled-plans/${planId}/daily-entries/${date}`, data),
};

// Leave Management API
export const leaveAPI = {
  // Leave Types
  getLeaveTypes: () => api.get('/leave-types'),
  createLeaveType: (data) => api.post('/leave-types', data),
  updateLeaveType: (id, data) => api.put(`/leave-types/${id}`, data),
  deleteLeaveType: (id) => api.delete(`/leave-types/${id}`),
  
  // Leave Balances
  getMyBalances: () => api.get('/leave-balances'),
  getAllBalances: (params) => api.get('/leave-balances/all', { params }), // Admin/HR - view all employee leave balances
  getUserBalances: (userId) => api.get(`/users/${userId}/leave-balances`),
  updateBalance: (id, data) => api.put(`/leave-balances/${id}`, data),
  
  // Leave Requests
  getMyLeaves: (params) => api.get('/leaves/my', { params }),
  getAllLeaves: (params) => api.get('/leaves', { params }),
  getPendingLeaves: () => api.get('/leaves/pending'),
  getLeave: (id) => api.get(`/leaves/${id}`),
  createLeave: (data) => api.post('/leaves', data),
  approveLeave: (id, data) => api.post(`/leaves/${id}/approve`, data),
  rejectLeave: (id, data) => api.post(`/leaves/${id}/reject`, data),
  cancelLeave: (id) => api.post(`/leaves/${id}/cancel`),
  
  // Statistics & Calendar
  getStatistics: (params) => api.get('/leaves/statistics', { params }),
  getCalendar: (params) => api.get('/leaves/calendar', { params }),
  getTeamOnLeave: () => api.get('/leaves/team-on-leave'),
  
  // Holidays
  getHolidays: (params) => api.get('/holidays', { params }),
  createHoliday: (data) => api.post('/holidays', data),
  updateHoliday: (id, data) => api.put(`/holidays/${id}`, data),
  deleteHoliday: (id) => api.delete(`/holidays/${id}`),
  
  // Utility
  calculateDays: (params) => api.get('/leaves/calculate-days', { params }),
};

export default api;
