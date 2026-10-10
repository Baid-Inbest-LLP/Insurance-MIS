import api from './axios';

export const reportsApi = {
  get: (report, params) => api.get(`/reports/${report}`, { params }),
};
