import api from './axios';

export const dashboardApi = {
  get: (params) => api.get('/dashboard', { params }),
};
