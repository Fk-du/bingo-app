// Empty NEXT_PUBLIC_BACKEND_URL = same-origin mode (Next.js rewrites proxy /api and /ws to the backend).
const DEFAULT_BACKEND_URL = 'http://localhost:8080';

export function getBackendUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (raw === undefined) return DEFAULT_BACKEND_URL;
  return normalizeUrl(raw);
}

export function getApiBaseUrl(): string {
  return `${getBackendUrl()}/api/v1`;
}

export function getWsBaseUrl(): string {
  return `${getBackendUrl()}/ws`;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
