import { el, mount } from './utils/dom.js';
import { navigate } from './router.js';

const TABS = [
  { path: '/dashboard', label: 'Home', icon: 'home' },
  { path: '/calendar', label: 'Calendar', icon: 'calendar' },
  { path: '/tasks/new', label: 'Add', icon: 'plus', accent: true },
  { path: '/insights', label: 'Insights', icon: 'chart' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chart: '<path d="M4 20V10M12 20V4M20 20v-7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};

function svgIcon(name) {
  const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  wrapper.setAttribute('viewBox', '0 0 24 24');
  wrapper.setAttribute('width', '22');
  wrapper.setAttribute('height', '22');
  wrapper.setAttribute('fill', 'none');
  wrapper.setAttribute('stroke', 'currentColor');
  wrapper.setAttribute('stroke-width', '2');
  wrapper.setAttribute('stroke-linecap', 'round');
  wrapper.setAttribute('stroke-linejoin', 'round');
  wrapper.innerHTML = ICONS[name] || '';
  return wrapper;
}

export function renderShell(root, { title, activePath, content, showBack = false }) {
  const header = el('header', { class: 'app-header' }, [
    showBack
      ? el('button', { class: 'icon-btn back-btn', 'aria-label': 'Back', onclick: () => history.back() }, [svgIcon('home')])
      : el('div', { class: 'app-logo' }, ['Routism']),
    el('h1', { class: 'app-title' }, [title || '']),
    el('div', { class: 'header-spacer' }),
  ]);

  const main = el('main', { class: 'app-content' }, [content]);

  const nav = el('nav', { class: 'bottom-nav' },
    TABS.map((tab) =>
      el('button', {
        class: `nav-tab${activePath === tab.path ? ' active' : ''}${tab.accent ? ' nav-tab-accent' : ''}`,
        onclick: () => navigate(tab.path),
        'aria-label': tab.label,
      }, [svgIcon(tab.icon), el('span', { class: 'nav-label' }, [tab.label])])
    )
  );

  mount(root, el('div', { class: 'app-shell' }, [header, main, nav]));
  return main;
}
