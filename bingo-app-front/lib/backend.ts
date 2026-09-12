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
  if (typeof window === 'undefined') return `${getBackendUrl()}/ws`;
  // Use the page's own origin so the WebSocket scheme always matches the page
  // (Next.js rewrites proxy /ws to the backend). This prevents SockJS mixed-content
  // errors like "an insecure SockJs connection may not be initiated from a page
  // loaded over HTTPS" when the page is served over HTTPS.
  return `${window.location.origin}/ws`;
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
