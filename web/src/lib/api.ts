import axios from 'axios';
import { useAuthStore } from '../store/auth';

const BASE = import.meta.env.VITE_API_URL || '';
export const api = axios.create({ baseURL: `${BASE}/api` });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) { useAuthStore.getState().logout(); return Promise.reject(err); }
      try {
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
        useAuthStore.getState().setAccessToken(data.access_token);
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(err);
  }
);

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
