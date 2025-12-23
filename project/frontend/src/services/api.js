import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
const BASE_URL = 'http://localhost:8001';

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
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
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

export default api;
