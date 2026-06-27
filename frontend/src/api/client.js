import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 20000,
});

// Attach the JWT from localStorage on every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tanvicrm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalise errors and auto-logout on 401 (except on the login call itself).
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('tanvicrm_token');
      localStorage.removeItem('tanvicrm_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login?expired=1');
      }
    }
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'Something went wrong';
    const details = error.response?.data?.error?.details;
    return Promise.reject(Object.assign(new Error(message), { status, details }));
  }
);

export default api;
