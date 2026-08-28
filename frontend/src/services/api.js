import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lifeops_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for unified response extraction & error handling
api.interceptors.response.use((response) => {
  return response.data;
}, (error) => {
  if (error.response && error.response.status === 401) {
    // Optionally redirect or clear token on session expiration
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      localStorage.removeItem('lifeops_token');
      localStorage.removeItem('lifeops_user');
    }
  }
  const customError = error.response?.data?.error || {
    message: error.message || 'An unexpected network error occurred'
  };
  return Promise.reject(customError);
});

export default api;
