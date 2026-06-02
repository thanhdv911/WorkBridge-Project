import axios from 'axios';

const getFallbackBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https://localhost:7238';
  }
  return 'http://localhost:5029';
};

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || getFallbackBaseUrl()).replace(/\/$/, '');

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

const authEndpoints = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/facebook',
  '/auth/forgot-password',
  '/auth/reset-password'
];

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isAuthEndpoint = authEndpoints.some((endpoint) => requestUrl.includes(endpoint));
    const hadSession = Boolean(localStorage.getItem('token'));

    if (status === 401 && hadSession && !isAuthEndpoint) {
      localStorage.clear();
      if (!['/login', '/signup'].includes(window.location.pathname)) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
