import { STORAGE_KEYS } from '../constants';

// Auth session lives in localStorage (the axios interceptor reads the token from here).
// These helpers are the single place that touches those keys.

export const getAccessToken = () => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

export const isAuthenticated = () => Boolean(getAccessToken());

export const getStoredUser = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.USER);
  return raw ? JSON.parse(raw) : null;
};

export const saveSession = ({ accessToken, refreshToken, user }) => {
  if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
};
