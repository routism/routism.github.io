const routes = [];
let notFoundHandler = () => {};
let beforeEachGuard = null;
let appRoot = null;

export function registerRoute(pattern, handler) {
  // pattern like '/tasks/:id' -> regex with named group capture
  const paramNames = [];
  const regexStr = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, handler, pattern });
}

export function setNotFoundHandler(handler) {
  notFoundHandler = handler;
}

export function setBeforeEach(guardFn) {
  beforeEachGuard = guardFn;
}

export function navigate(path) {
  if (location.hash.slice(1) === path) {
    resolve();
  } else {
    location.hash = path;
  }
}

function currentPath() {
  const hash = location.hash.slice(1);
  return hash || '/onboarding';
}

async function resolve() {
  const path = currentPath();
  const [pathname, queryString] = path.split('?');
  const query = Object.fromEntries(new URLSearchParams(queryString || ''));

  for (const route of routes) {
    const match = pathname.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });

      if (beforeEachGuard) {
        const redirect = await beforeEachGuard(route.pattern, params);
        if (redirect) {
          navigate(redirect);
          return;
        }
      }
      route.handler(appRoot, params, query);
      return;
    }
  }
  notFoundHandler(appRoot);
}

export function startRouter(root) {
  appRoot = root;
  window.addEventListener('hashchange', resolve);
  resolve();
}
