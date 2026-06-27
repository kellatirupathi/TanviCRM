import api from './client.js';

export const authApi = {
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data.data),
  me: () => api.get('/auth/me').then((r) => r.data.data),
  changePassword: (payload) =>
    api.post('/auth/change-password', payload).then((r) => r.data.data),
};

export const metaApi = {
  get: () => api.get('/meta').then((r) => r.data.data),
};

export const customerApi = {
  list: (params) => api.get('/customers', { params }).then((r) => r.data.data),
  get: (id) => api.get(`/customers/${id}`).then((r) => r.data.data),
  create: (payload) => api.post('/customers', payload).then((r) => r.data.data.customer),
  update: (id, payload) =>
    api.put(`/customers/${id}`, payload).then((r) => r.data.data.customer),
  remove: (id) => api.delete(`/customers/${id}`).then((r) => r.data.data),
  exportUrl: (params) => {
    const qs = new URLSearchParams(params).toString();
    return `/api/customers/export${qs ? `?${qs}` : ''}`;
  },
};

export const purchaseApi = {
  list: (params) => api.get('/purchases', { params }).then((r) => r.data.data),
  create: (payload) => api.post('/purchases', payload).then((r) => r.data.data.purchase),
  update: (id, payload) =>
    api.put(`/purchases/${id}`, payload).then((r) => r.data.data.purchase),
  remove: (id) => api.delete(`/purchases/${id}`).then((r) => r.data.data),
};

export const analyticsApi = {
  summary: (params) => api.get('/analytics/summary', { params }).then((r) => r.data.data),
  topCustomers: (params) =>
    api.get('/analytics/top-customers', { params }).then((r) => r.data.data.items),
  topCategories: () =>
    api.get('/analytics/top-categories').then((r) => r.data.data.items),
  revenueTrend: (params) =>
    api.get('/analytics/revenue-trend', { params }).then((r) => r.data.data.items),
  newVsReturning: (params) =>
    api.get('/analytics/new-vs-returning', { params }).then((r) => r.data.data.items),
};

export const userApi = {
  list: () => api.get('/users').then((r) => r.data.data.items),
  create: (payload) => api.post('/users', payload).then((r) => r.data.data.user),
  update: (id, payload) => api.put(`/users/${id}`, payload).then((r) => r.data.data.user),
  remove: (id) => api.delete(`/users/${id}`).then((r) => r.data.data),
};
