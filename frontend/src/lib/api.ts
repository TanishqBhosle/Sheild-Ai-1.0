import { auth } from './firebase';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5002').replace(/\/$/, '');

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // Check localStorage for custom JWT (MERN style)
  const customToken = localStorage.getItem('aegis_token');
  if (customToken) {
    headers['Authorization'] = `Bearer ${customToken}`;
  } else {
    // Fallback to Firebase
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  headers['X-Request-Id'] = crypto.randomUUID();
  return headers;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401 || (res.status === 404 && data.error === "Organization not found")) {
      // Session is invalid or stale (e.g. emulator restarted)
      localStorage.removeItem('aegis_token');
      localStorage.removeItem('aegis_user');
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth?error=session_expired';
      }
    }
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
