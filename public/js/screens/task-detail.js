import { el, toast, showLoading } from '../utils/dom.js';
import { renderShell } from '../shell.js';
import { navigate } from '../router.js';
import { api, ApiError } from '../api.js';
import { removeTask, upsertTask, getState } from '../state.js';
import { recurrenceSummary } from '../utils/formatters.js';
import { formatTime, relativeDay, parseISODate } from '../utils/date.js';

const STATUS_META = {
  completed: { icon: '✅', label: 'Completed' },
  skipped: { icon: '⏭️', label: 'Skipped' },
  missed: { icon: '❌', label: 'Missed' },
};

export async function renderTaskDetail(root, params) {
  const content = el('div', { class: 'task-detail-screen' });
  const main = renderShell(root, { title: 'Routine', activePath: '', showBack: true, content });
  showLoading(content);

  let task;
  try {
    ({ task } = await api.get(`/tasks/${params.id}`));
  } catch (err) {
    content.innerHTML = '';
    content.appendChild(el('div', { class: 'error-state' }, [err instanceof ApiError ? err.message : 'Could not load task']));
    return main;
  }

  const { timeFormat } = getState();

  async function refresh() {
    ({ task } = await api.get(`/tasks/${params.id}`));
    render();
  }

  function render() {
    content.innerHTML = '';
    content.appendChild(el('div', { class: 'task-detail-card' }, [
      el('h2', [task.name]),
      task.description ? el('p', { class: 'task-detail-description' }, [task.description]) : null,
      el('div', { class: 'task-detail-row' }, [
        el('span', { class: 'label' }, ['Next occurrence']),
        el('span', [task.nextOccurrence ? relativeDay(parseISODate(task.nextOccurrence.slice(0, 10))) : '—']),
      ]),
      el('div', { class: 'task-detail-row' }, [
        el('span', { class: 'label' }, ['Frequency']),
        el('span', [recurrenceSummary(task.recurrenceType, task.recurrenceConfig)]),
      ]),
      task.reminderTime ? el('div', { class: 'task-detail-row' }, [
        el('span', { class: 'label' }, ['Reminder']),
        el('span', [formatTime(task.reminderTime, timeFormat)]),
      ]) : null,
      el('div', { class: 'task-detail-row' }, [
        el('span', { class: 'label' }, ['Status']),
        el('span', { class: `status-pill status-${task.status}` }, [task.status]),
      ]),
    ]));

    content.appendChild(el('div', { class: 'task-detail-actions' }, [
      task.status === 'active'
        ? el('button', { class: 'btn btn-primary', onclick: async () => {
            const { task: updated, unlockedAchievements } = await api.post(`/tasks/${task.id}/complete`, {}).catch((err) => {
              toast(err instanceof ApiError ? err.message : 'Could not complete', { type: 'error' });
              return {};
            });
            if (updated) {
              upsertTask(updated);
              toast('Marked complete! 🎉');
              if (unlockedAchievements?.length) setTimeout(() => toast(`Achievement unlocked: ${unlockedAchievements[0].label}`), 900);
              refresh();
            }
          } }, ['Mark Complete'])
        : null,
      task.status === 'active'
        ? el('button', { class: 'btn btn-secondary', onclick: async () => {
            const { task: updated } = await api.post(`/tasks/${task.id}/skip`, {}).catch((err) => {
              toast(err instanceof ApiError ? err.message : 'Could not skip', { type: 'error' });
              return {};
            });
            if (updated) {
              upsertTask(updated);
              toast('Occurrence skipped');
              refresh();
            }
          } }, ['Skip'])
        : null,
      el('button', { class: 'btn btn-secondary', onclick: () => navigate(`/tasks/${task.id}/edit`) }, ['Edit']),
      task.status === 'active'
        ? el('button', { class: 'btn btn-ghost', onclick: async () => {
            const { task: updated } = await api.post(`/tasks/${task.id}/pause`, {});
            upsertTask(updated);
            toast('Routine paused');
            refresh();
          } }, ['Pause'])
        : el('button', { class: 'btn btn-ghost', onclick: async () => {
            const { task: updated } = await api.post(`/tasks/${task.id}/resume`, {});
            upsertTask(updated);
            toast('Routine resumed');
            refresh();
          } }, ['Resume']),
      el('button', { class: 'btn btn-danger', onclick: async () => {
        if (!confirm(`Delete "${task.name}"? This can't be undone.`)) return;
        try {
          await api.delete(`/tasks/${task.id}`);
          removeTask(task.id);
          toast('Routine deleted');
          navigate('/dashboard');
        } catch (err) {
          toast(err instanceof ApiError ? err.message : 'Could not delete', { type: 'error' });
        }
      } }, ['Delete']),
    ]));

    const historySection = el('div', { class: 'history-section' }, [
      el('h3', ['History']),
      el('div', { id: 'history-list', class: 'history-list' }),
    ]);
    content.appendChild(historySection);

    api.get(`/tasks/${task.id}/history`).then(({ history }) => {
      const historyList = content.querySelector('#history-list');
      if (!historyList) return;
      if (!history.length) {
        historyList.appendChild(el('p', { class: 'day-detail-empty' }, ['Nothing recorded yet — completed, skipped, and missed occurrences will show up here.']));
        return;
      }
      history.forEach((h) => {
        const meta = STATUS_META[h.status] || STATUS_META.completed;
        historyList.appendChild(el('div', { class: `history-item history-item-${h.status}` }, [
          el('span', { class: 'history-icon' }, [meta.icon]),
          el('span', [h.occurrence_date]),
          el('span', { class: 'history-status-label' }, [meta.label]),
        ]));
      });
    }).catch(() => {});
  }

  render();
  return main;
}

