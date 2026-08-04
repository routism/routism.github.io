/**
 * Create an element with attributes, children, and event listeners.
 * el('button', { class: 'btn', onclick: fn }, ['Save'])
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      node.className = value;
    } else if (key === 'dataset') {
      for (const [dKey, dVal] of Object.entries(value)) node.dataset[dKey] = dVal;
    } else if (key === 'html') {
      node.innerHTML = value;
    } else {
      node.setAttribute(key, value);
    }
  }

  const kids = Array.isArray(children) ? children : [children];
  for (const child of kids) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(child) : child);
  }

  return node;
}

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

export function mount(root, node) {
  root.innerHTML = '';
  root.appendChild(node);
}

let toastTimer = null;
export function toast(message, { type = 'info', duration = 3200 } = {}) {
  let container = qs('#toast-root');
  if (!container) {
    container = el('div', { id: 'toast-root', class: 'toast-root' });
    document.body.appendChild(container);
  }
  container.innerHTML = '';
  const node = el('div', { class: `toast toast-${type}` }, [message]);
  container.appendChild(node);

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.remove(), duration);
}

export function showLoading(root) {
  mount(root, el('div', { class: 'loading-spinner-wrap' }, [el('div', { class: 'spinner' })]));
}
