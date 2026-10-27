import axios from 'axios';
export const ORIGIN = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: ORIGIN + '/api' });
api.interceptors.request.use((c) => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = 'Bearer ' + t; return c; });
api.interceptors.response.use((r) => r, (e) => {
  const signedIn = localStorage.getItem('token');
  if (e.response?.status === 401 && signedIn && !e.config.url.includes('/auth/')) {
    localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login';
  }
  return Promise.reject(e);
});
export const msg = (e) => e.response?.data?.message || e.message;
export default api;
