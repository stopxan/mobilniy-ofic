import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://YOUR_SERVER_IP:3001/api';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat('ru-RU').format(amount) + ' so\'m';
