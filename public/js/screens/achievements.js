import { el, showLoading } from '../utils/dom.js';
import { renderShell } from '../shell.js';
import { api, ApiError } from '../api.js';

function badge(a) {
  return el('div', { class: `achievement-badge${a.unlocked ? ' unlocked' : ''}` }, [
    el('div', { class: 'achievement-icon' }, [a.unlocked ? '🏆' : '🔒']),
    el('div', { class: 'achievement-label' }, [a.label]),
    el('div', { class: 'achievement-desc' }, [a.description]),
  ]);
}

export async function renderAchievements(root) {
  const content = el('div', { class: 'achievements-screen', id: 'achievements-grid' });
  const main = renderShell(root, { title: 'Achievements', activePath: '/settings', showBack: true, content });
  showLoading(content);

  try {
    const { achievements } = await api.get('/achievements');
    content.innerHTML = '';
    content.appendChild(el('div', { class: 'achievements-grid' }, achievements.map(badge)));
  } catch (err) {
    content.innerHTML = '';
    content.appendChild(el('div', { class: 'error-state' }, [err instanceof ApiError ? err.message : 'Could not load achievements']));
  }

  return main;
}
