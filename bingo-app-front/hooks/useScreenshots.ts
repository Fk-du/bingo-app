import { useMutation } from '@tanstack/react-query';
import { screenshotsApi } from '@/api';

export function useUploadScreenshot() {
  return useMutation({
    mutationFn: (file: File) => screenshotsApi.upload(file),
  });
}
