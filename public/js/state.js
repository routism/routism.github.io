const listeners = new Set();

const state = {
  user: null,
  tasks: [],
  premium: null,
  theme: 'classic',
  timeFormat: '12h',
  booted: false,
};

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const listener of listeners) listener(state);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setUser(user) {
  setState({
    user,
    theme: user?.theme || 'classic',
    timeFormat: user?.timeFormat || '12h',
  });
  applyTheme(state.theme);
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'classic');
}

export function setTasks(tasks) {
  setState({ tasks });
}

export function upsertTask(task) {
  const idx = state.tasks.findIndex((t) => t.id === task.id);
  const tasks = [...state.tasks];
  if (idx === -1) tasks.push(task);
  else tasks[idx] = task;
  setState({ tasks });
}

export function removeTask(taskId) {
  setState({ tasks: state.tasks.filter((t) => t.id !== taskId) });
}
