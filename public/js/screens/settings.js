import { el, toast, mount } from '../utils/dom.js';
import { renderShell } from '../shell.js';
import { navigate } from '../router.js';
import { api, ApiError } from '../api.js';
import { clearToken } from '../utils/storage.js';
import { setUser, applyTheme, getState } from '../state.js';
import { THEMES, TIME_FORMATS } from '../utils/constants.js';
import { initials } from '../utils/formatters.js';

function row(label, control) {
  return el('div', { class: 'settings-row' }, [el('span', { class: 'settings-row-label' }, [label]), control]);
}

export async function renderSettings(root) {
  const { user } = getState();
  if (!user) { navigate('/login'); return; }

  const content = el('div', { class: 'settings-screen' }, [
    el('div', { class: 'settings-profile' }, [
      el('div', { class: 'settings-avatar' }, [initials(user.name || user.email)]),
      el('div', [
        el('div', { class: 'settings-name' }, [user.name || 'Routism user']),
        el('div', { class: 'settings-email' }, [user.email]),
      ]),
    ]),

    el('div', { class: 'settings-section' }, [
      el('h3', ['Appearance']),
      row('Theme', el('select', {
        class: 'field-input',
        onchange: async (e) => {
          try {
            const { user: updated } = await api.put('/settings/preferences', { theme: e.target.value });
            setUser(updated);
            toast('Theme updated');
          } catch (err) {
            toast(err instanceof ApiError ? err.message : 'Could not update theme', { type: 'error' });
          }
        },
      }, THEMES.map((t) => el('option', { value: t.id, selected: t.id === user.theme }, [t.label])))),
      row('Time format', el('select', {
        class: 'field-input',
        onchange: async (e) => {
          try {
            const { user: updated } = await api.put('/settings/preferences', { timeFormat: e.target.value });
            setUser(updated);
            toast('Time format updated');
          } catch (err) {
            toast(err instanceof ApiError ? err.message : 'Could not update', { type: 'error' });
          }
        },
      }, TIME_FORMATS.map((t) => el('option', { value: t.id, selected: t.id === user.timeFormat }, [t.label])))),
    ]),

    el('div', { class: 'settings-section' }, [
      el('h3', ['Account']),
      el('button', { class: 'settings-link', onclick: () => navigate('/premium') }, [
        `Premium — ${user.subscriptionTier === 'founder' ? 'Founder' : user.subscriptionTier}`,
        el('span', { class: 'chevron' }, ['›']),
      ]),
      el('button', { class: 'settings-link', onclick: () => navigate('/achievements') }, [
        'Achievements', el('span', { class: 'chevron' }, ['›']),
      ]),
    ]),

    el('div', { class: 'settings-section' }, [
      el('h3', ['Danger zone']),
      el('button', {
        class: 'settings-link danger',
        onclick: async () => {
          if (!confirm('Delete your account? All routines and history will be permanently removed.')) return;
          try {
            await api.delete('/settings/account');
            clearToken();
            toast('Account deleted');
            navigate('/onboarding');
          } catch (err) {
            toast(err instanceof ApiError ? err.message : 'Could not delete account', { type: 'error' });
          }
        },
      }, ['Delete account']),
      el('button', {
        class: 'settings-link',
        onclick: () => {
          clearToken();
          setUser(null);
          navigate('/onboarding');
        },
      }, ['Log out']),
    ]),
  ]);

  renderShell(root, { title: 'Settings', activePath: '/settings', content });
}
