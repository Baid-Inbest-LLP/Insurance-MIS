import api from './axios';

export const companiesApi = {
  getAll: (params) => api.get('/companies', { params }),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};
