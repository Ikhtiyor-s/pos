import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('pos-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // ignore parse errors
  }
  return config;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const stored = localStorage.getItem('pos-auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          const refreshToken = parsed?.state?.refreshToken;

          if (refreshToken) {
            const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });

            if (data.success && data.data) {
              parsed.state.accessToken = data.data.accessToken;
              parsed.state.refreshToken = data.data.refreshToken;
              localStorage.setItem('pos-auth', JSON.stringify(parsed));

              originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
              return api(originalRequest);
            }
          }
        }
      } catch {
        localStorage.removeItem('pos-auth');
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
