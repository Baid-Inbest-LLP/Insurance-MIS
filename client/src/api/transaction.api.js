import api from './axios';

export const transactionsApi = {
  getOptions: (department) => api.get('/masters/lookups', { params: department ? { department } : undefined }),
  getOne: (id) => api.get(`/transactions/${id}`),
  getAll: (params) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
};
