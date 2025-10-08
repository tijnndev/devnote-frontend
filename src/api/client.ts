import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../store/auth';

const baseURL = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const envApiKey = import.meta.env.VITE_API_KEY;

const resolveApiKey = () => {
  const { apiKey } = useAuthStore.getState();
  return apiKey ?? envApiKey ?? undefined;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const apiKey = resolveApiKey();
  if (apiKey && !config.headers.has('x-api-key')) {
    config.headers.set('x-api-key', apiKey);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearApiKey();
    }
    return Promise.reject(error);
  }
);
