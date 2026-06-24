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
  verifyEmail: (email, code) => api.post('/auth/verify-email', { email, code }),
  resendCode: (email) => api.post('/auth/resend-code', { email }),
  verificationStatus: () => api.get('/auth/verification-status'),
  changePassword: (current_password, new_password) => api.put('/auth/password', { current_password, new_password }),
  setInitialPassword: (new_password) => api.post('/auth/set-initial-password', { new_password }),
  googleConfig: () => api.get('/auth/google/config'),
  googleLogin: (credential) => api.post('/auth/google', { credential }),
};

// DNS Records
export const dnsAPI = {
  listRecords: () => api.get('/dns/records'),
  listZones: () => api.get('/dns/zones'),
  createRecord: (data) => api.post('/dns/records', data),
  updateRecord: (id, data) => api.put(`/dns/records/${id}`, data),
  deleteRecord: (id) => api.delete(`/dns/records/${id}`),
  exportCSV: () => api.get('/dns/records/export', { responseType: 'blob' }),
  downloadTemplate: () => api.get('/dns/records/import/template', { responseType: 'blob' }),
  importCSV: (csv) => api.post('/dns/records/import', { csv }),
};

// Referral
export const referralAPI = {
  getStats: () => api.get('/referral/stats'),
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
  bulkUpdatePlan: (user_ids, plan) => api.post('/admin/users/bulk/plan', { user_ids, plan }),
  bulkDeleteUsers: (user_ids) => api.post('/admin/users/bulk/delete', { user_ids }),
  listAllRecords: () => api.get('/admin/records'),
  createRecord: (data) => api.post('/admin/dns/records', data),
  deleteRecord: (id) => api.delete(`/admin/dns/records/${id}`),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  listPlans: () => api.get('/admin/plans'),
  createPlan: (data) => api.post('/admin/plans', data),
  updatePlan: (plan_id, data) => api.put(`/admin/plans/${plan_id}`, data),
  deletePlan: (plan_id) => api.delete(`/admin/plans/${plan_id}`),
  // Bot management
  getBotStatus: () => api.get('/admin/bot/status'),
  updateBotToken: (token) => api.put('/admin/bot/token', { token }),
  updateBotAdminId: (admin_id) => api.put('/admin/bot/admin-id', { admin_id }),
  stopBot: () => api.post('/admin/bot/stop'),
  startBot: () => api.post('/admin/bot/start'),
  // Zones management
  listZones: () => api.get('/admin/zones'),
  addZone: (zone_id, api_token) => api.post('/admin/zones', { zone_id, api_token }),
  removeZone: (zone_id) => api.delete(`/admin/zones/${zone_id}`),
  toggleZone: (zone_id, enabled) => api.patch(`/admin/zones/${zone_id}`, { enabled }),
  exportAllRecordsCSV: () => api.get('/admin/records/export', { responseType: 'blob' }),
  downloadAdminTemplate: () => api.get('/admin/records/import/template', { responseType: 'blob' }),
  importAllRecordsCSV: (csv) => api.post('/admin/records/import', { csv }),
  getCfToken: () => api.get('/admin/cf-token'),
  updateCfToken: (api_token) => api.put('/admin/cf-token', { api_token }),
  testCfToken: () => api.post('/admin/cf-token/test'),
  // Backup
  getBackupSettings: () => api.get('/admin/backup/settings'),
  updateBackupSettings: (data) => api.put('/admin/backup/settings', data),
  triggerBackup: () => api.post('/admin/backup/now'),
  restoreBackup: () => api.post('/admin/backup/restore'),
  testBackupBot: (data) => api.post('/admin/backup/test-bot', data),
  // SMTP management
  getSmtpStatus: () => api.get('/admin/smtp/status'),
  updateSmtp: (smtp_email, smtp_password) => api.put('/admin/smtp/config', { smtp_email, smtp_password }),
  toggleVerification: (enabled) => api.put('/admin/smtp/toggle-verification', { enabled }),
  // Google OAuth
  getGoogleOAuth: () => api.get('/admin/google-oauth'),
  updateGoogleOAuth: (data) => api.put('/admin/google-oauth', data),
  // Record types
  getRecordTypes: () => api.get('/admin/record-types'),
  updateRecordTypes: (enabled) => api.put('/admin/record-types', { enabled }),
};

// Contact
export const contactAPI = {
  getContactInfo: () => api.get('/settings/contact'),
};

// Activity Logs
export const activityAPI = {
  getLogs: (page = 1, limit = 20) => api.get(`/activity/logs?page=${page}&limit=${limit}`),
  getAdminLogs: (page = 1, limit = 50, userId = '', action = '') => {
    let url = `/admin/activity/logs?page=${page}&limit=${limit}`;
    if (userId) url += `&user_id=${userId}`;
    if (action) url += `&action=${action}`;
    return api.get(url);
  },
};

export default api;
