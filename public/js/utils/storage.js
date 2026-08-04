import { AUTH_TOKEN_KEY } from './constants.js';

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode, quota) — fail silently */
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getToken() {
  return safeGet(AUTH_TOKEN_KEY);
}

export function setToken(token) {
  safeSet(AUTH_TOKEN_KEY, token);
}

export function clearToken() {
  safeRemove(AUTH_TOKEN_KEY);
}

export function getJSON(key, fallback = null) {
  const raw = safeGet(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  safeSet(key, JSON.stringify(value));
}
