import axios from 'axios';

/**
 * Single API client for all IDP Platform services.
 * In development (Vite dev server): hits individual ports directly.
 * In production (served via Nginx): all routes go through port 80.
 *
 * Controlled by VITE_API_BASE_URL env var.
 * Development: unset (falls back to auth-service on 3001, matching authSlice usage)
 * Production:  VITE_API_BASE_URL=http://localhost (uses Nginx)
 */
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001'}/api/v1`;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);