import axios from 'axios';
import { STORAGE_KEYS } from '../constants';
import { clearSession } from '../lib/session';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

const parseBlobError = async (error) => {
  const response = error.response;
  if (response?.data instanceof Blob && response.data.type.includes('json')) {
    try {
      response.data = JSON.parse(await response.data.text());
    } catch {
      // leave response.data as-is if it isn't valid JSON
    }
  }
  return error;
};

const redirectToLogin = () => {
  clearSession();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      await parseBlobError(error);
    }

    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const authUrl = originalRequest.url || '';
      if (authUrl.includes('/auth/login') || authUrl.includes('/auth/register')) {
        return Promise.reject(error);
      }

      if (authUrl.includes('/auth/refresh')) {
        redirectToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        isRefreshing = false;
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newToken = data.data.accessToken;
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken);
        if (data.data.refreshToken) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.data.refreshToken);
        }
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // A newer login may have replaced localStorage while this refresh was in-flight.
        // Do not wipe the newer session.
        const currentRefresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (currentRefresh && currentRefresh !== refreshToken) {
          processQueue(refreshError, null);
          return Promise.reject(refreshError);
        }
        processQueue(refreshError, null);
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
