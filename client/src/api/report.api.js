import api from './axios';

export const reportsApi = {
  get: (report, params) => api.get(`/reports/${report}`, { params }),
  export: (report, params) => api.get(`/reports/${report}/export`, { params, responseType: 'blob' }),
  exportPdf: (report, params) => api.get(`/reports/${report}/export/pdf`, { params, responseType: 'blob' }),
};
