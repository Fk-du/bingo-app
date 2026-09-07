import apiClient from './client';
import { ApiResponse } from '@/types';

const API_PREFIX = '/api/v1';

export const screenshotsApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<string>>('/screenshots/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  fetchBlobUrl: async (url: string) => {
    if (!url.startsWith(API_PREFIX)) {
      return url;
    }
    const path = url.slice(API_PREFIX.length);
    const res = await apiClient.get<Blob>(path, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },
};
