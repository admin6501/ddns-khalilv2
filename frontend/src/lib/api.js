import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
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

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// DNS Records
export const dnsAPI = {
  listRecords: () => api.get('/dns/records'),
  createRecord: (data) => api.post('/dns/records', data),
  updateRecord: (id, data) => api.put(`/dns/records/${id}`, data),
  deleteRecord: (id) => api.delete(`/dns/records/${id}`),
};

// Plans
export const plansAPI = {
  getPlans: () => api.get('/plans'),
};

// Admin
export const adminAPI = {
  listUsers: () => api.get('/admin/users'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateUserPlan: (id, plan) => api.put(`/admin/users/${id}/plan`, { plan }),
  changeUserPassword: (id, new_password) => api.put(`/admin/users/${id}/password`, { new_password }),
  getUserRecords: (id) => api.get(`/admin/users/${id}/records`),
  listAllRecords: () => api.get('/admin/records'),
  createRecord: (data) => api.post('/admin/dns/records', data),
  deleteRecord: (id) => api.delete(`/admin/dns/records/${id}`),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  // Plans CRUD
  listPlans: () => api.get('/admin/plans'),
  createPlan: (data) => api.post('/admin/plans', data),
  updatePlan: (plan_id, data) => api.put(`/admin/plans/${plan_id}`, data),
  deletePlan: (plan_id) => api.delete(`/admin/plans/${plan_id}`),
};

// Contact
export const contactAPI = {
  getContactInfo: () => api.get('/settings/contact'),
};

export default api;
