import axios from 'axios';
import { getApiBaseUrl } from '@/lib/backend';

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const initData = window.Telegram?.WebApp?.initData;
    if (initData) {
      config.headers.Authorization = `tma ${initData}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const body = error.response?.data as
      | { message?: string; userMessage?: string }
      | undefined;

    error.userMessage =
      body?.userMessage ?? body?.message ?? error.message ?? 'Something went wrong';

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  return (error as { userMessage?: string })?.userMessage ?? 'Something went wrong';
}

export default apiClient;
