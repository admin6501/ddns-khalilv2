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

export default api;
