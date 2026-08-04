export function debounce(fn, waitMs = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

export function classNames(...args) {
  return args.filter(Boolean).join(' ');
}

export function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * urlBase64 -> Uint8Array, required for the PushManager subscribe() call.
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
