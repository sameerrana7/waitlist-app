import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally (token expired → redirect to login)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// ─── Queue ───────────────────────────────────────────────────────────
export const queueAPI = {
  join: (data) => api.post('/queue/join', data),
  getStatus: (branchId) => api.get(`/queue/${branchId}/status`),
  getQueue: (branchId) => api.get(`/queue/${branchId}`),
  call: (branchId, entryId) => api.patch(`/queue/${branchId}/${entryId}/call`),
  seat: (branchId, entryId) => api.patch(`/queue/${branchId}/${entryId}/seat`),
  skip: (branchId, entryId) => api.patch(`/queue/${branchId}/${entryId}/skip`),
  remove: (branchId, entryId) => api.delete(`/queue/${branchId}/${entryId}`),
  reset: (branchId) => api.delete(`/queue/${branchId}/reset/all`),
};

export default api;
