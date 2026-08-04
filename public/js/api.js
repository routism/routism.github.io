import { API_BASE } from './utils/constants.js';
import { getToken, clearToken } from './utils/storage.js';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError('Network error — check your connection and try again.', 0);
  }

  const isJSON = (response.headers.get('content-type') || '').includes('application/json');
  const data = isJSON ? await response.json().catch(() => ({})) : null;

  if (response.status === 401) {
    clearToken();
  }

  if (!response.ok) {
    throw new ApiError(data?.error || `Request failed (${response.status})`, response.status, data?.details);
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),

  // Non-JSON downloads (CSV/PDF export) need the raw response, not parsed JSON.
  async download(path) {
    const headers = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}${path}`, { headers });
    if (!response.ok) throw new ApiError(`Download failed (${response.status})`, response.status);
    return response.blob();
  },
};
