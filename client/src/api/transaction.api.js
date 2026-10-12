import api from './axios';

export const transactionsApi = {
  getOptions: (department) => api.get('/masters/lookups', { params: department ? { department } : undefined }),
  getOne: (id) => api.get(`/transactions/${id}`),
  getAll: (params) => api.get('/transactions', { params }),
  // Reading a policy waits for the AI, so it is given longer than a normal request. The instance
  // defaults to JSON, which would turn the FormData into a JSON object and drop the file.
  extractPolicy: ({ department, kind, file }) => {
    const body = new FormData();
    body.append('department', department);
    body.append('kind', kind);
    body.append('policy', file);
    return api.post('/transactions/extract-policy', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90 * 1000,
    });
  },
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
};
