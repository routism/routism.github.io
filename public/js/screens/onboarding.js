import { el, mount } from '../utils/dom.js';
import { navigate } from '../router.js';

export function renderOnboarding(root) {
  const view = el('div', { class: 'onboarding-screen' }, [
    el('div', { class: 'onboarding-hero' }, [
      el('div', { class: 'onboarding-logo' }, ['R']),
      el('h1', { class: 'onboarding-app-name' }, ['Routism']),
      el('p', { class: 'onboarding-tagline' }, ['Your routine. On autopilot.']),
    ]),
    el('div', { class: 'onboarding-actions' }, [
      el('button', { class: 'btn btn-primary btn-block', onclick: () => navigate('/signup') }, ['Get Started']),
      el('button', { class: 'btn btn-ghost btn-block', onclick: () => navigate('/login') }, ['Login']),
    ]),
  ]);
  mount(root, view);
}
