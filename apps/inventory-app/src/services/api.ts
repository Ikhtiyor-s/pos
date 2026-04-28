import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_URL: string = (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_API_URL : undefined) || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('inventory-auth') || localStorage.getItem('pos-auth');
    if (stored) {
      const token = JSON.parse(stored)?.state?.accessToken;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* ignore */ }
  return config;
});

export default api;
