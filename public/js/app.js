import { registerRoute, setNotFoundHandler, setBeforeEach, startRouter, navigate } from './router.js';
import { getToken } from './utils/storage.js';
import { api } from './api.js';
import { setUser, getState, applyTheme } from './state.js';
import { el, mount } from './utils/dom.js';
import { urlBase64ToUint8Array } from './utils/helpers.js';

import { renderOnboarding } from './screens/onboarding.js';
import { renderLogin, renderSignup, renderForgotPassword } from './screens/auth.js';
import { renderDashboard } from './screens/dashboard.js';
import { renderCreateTask } from './screens/create-task.js';
import { renderCalendar } from './screens/calendar.js';
import { renderTaskDetail } from './screens/task-detail.js';
import { renderInsights } from './screens/insights.js';
import { renderPremium } from './screens/premium.js';
import { renderSettings } from './screens/settings.js';
import { renderAchievements } from './screens/achievements.js';

const PUBLIC_ROUTES = new Set(['/onboarding', '/login', '/signup', '/forgot-password']);

async function bootstrapAuth() {
  const token = getToken();
  if (!token) return;
  try {
    const { user } = await api.get('/auth/me');
    setUser(user);
  } catch {
    // Invalid/expired token — api.js already cleared it on a 401.
  }
}

function registerRoutes() {
  registerRoute('/onboarding', renderOnboarding);
  registerRoute('/login', renderLogin);
  registerRoute('/signup', renderSignup);
  registerRoute('/forgot-password', renderForgotPassword);
  registerRoute('/dashboard', renderDashboard);
  registerRoute('/calendar', renderCalendar);
  registerRoute('/tasks/new', renderCreateTask);
  registerRoute('/tasks/:id', renderTaskDetail);
  registerRoute('/tasks/:id/edit', renderCreateTask);
  registerRoute('/insights', renderInsights);
  registerRoute('/premium', renderPremium);
  registerRoute('/settings', renderSettings);
  registerRoute('/achievements', renderAchievements);

  setNotFoundHandler((root) => navigate('/dashboard'));

  setBeforeEach(async (pattern) => {
    const { user } = getState();
    const isPublic = PUBLIC_ROUTES.has(pattern);
    if (!isPublic && !user) return '/onboarding';
    if (isPublic && user && pattern !== '/onboarding') return '/dashboard';
    return null;
  });
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    await subscribeToPush(registration);
  } catch (err) {
    console.warn('Service worker registration failed', err);
  }
}

async function subscribeToPush(registration) {
  if (!('PushManager' in window)) return;
  try {
    const { publicKey } = await api.get('/notifications/vapid-public-key');
    if (!publicKey) return; // Push not configured server-side — skip silently.

    const existing = await registration.pushManager.getSubscription();
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await api.post('/notifications/subscribe', { subscription });
  } catch (err) {
    console.warn('Push subscription failed', err);
  }
}

async function main() {
  const root = document.getElementById('app');
  applyTheme(getState().theme);

  await bootstrapAuth();
  registerRoutes();
  startRouter(root);

  if (getState().user) {
    registerServiceWorker();
  }
}

main();
