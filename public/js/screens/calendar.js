import { el, toast, showLoading } from '../utils/dom.js';
import { renderShell } from '../shell.js';
import { navigate } from '../router.js';
import { api, ApiError } from '../api.js';
import { toISODate, startOfWeek, startOfMonth, endOfMonth, addDays, formatMonthYear, isToday } from '../utils/date.js';

function emptyState() {
  return el('div', { class: 'empty-state' }, [
    el('div', { class: 'empty-state-illustration' }, ['🗓️']),
    el('h2', ['Nothing scheduled yet']),
    el('p', ['Once you create a routine, it will show up here on the days it repeats.']),
    el('button', { class: 'btn btn-primary', onclick: () => navigate('/tasks/new') }, ['Create a Routine']),
  ]);
}

function dayCell(date, occurrences, onSelect, selected) {
  const key = toISODate(date);
  const items = occurrences[key] || [];
  return el('button', {
    class: `calendar-day${isToday(date) ? ' is-today' : ''}${selected === key ? ' selected' : ''}`,
    dataset: { key },
    onclick: () => onSelect(key),
  }, [
    el('span', { class: 'calendar-day-number' }, [String(date.getDate())]),
    items.length ? el('span', { class: 'calendar-dot-row' }, items.slice(0, 3).map((item) =>
      el('span', { class: `calendar-dot calendar-dot-${item.status}` })
    )) : null,
  ]);
}

export async function renderCalendar(root) {
  let view = 'monthly';
  let cursor = new Date();
  let occurrences = {};
  let selectedDay = toISODate(new Date());

  const content = el('div', { class: 'calendar-screen' }, [
    el('div', { class: 'calendar-toolbar' }, [
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => shiftCursor(-1) }, ['‹']),
      el('h2', { id: 'calendar-label' }, ['']),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: () => shiftCursor(1) }, ['›']),
      el('div', { class: 'view-toggle' }, [
        el('button', { class: 'toggle-btn active', id: 'toggle-week', onclick: () => setView('weekly') }, ['Week']),
        el('button', { class: 'toggle-btn', id: 'toggle-month', onclick: () => setView('monthly') }, ['Month']),
      ]),
    ]),
    el('div', { id: 'calendar-grid', class: 'calendar-grid' }),
    el('div', { id: 'day-detail', class: 'day-detail' }),
  ]);

  const main = renderShell(root, { title: 'Calendar', activePath: '/calendar', content });
  const grid = content.querySelector('#calendar-grid');
  const label = content.querySelector('#calendar-label');
  const dayDetail = content.querySelector('#day-detail');

  function setView(next) {
    view = next;
    content.querySelector('#toggle-week').classList.toggle('active', view === 'weekly');
    content.querySelector('#toggle-month').classList.toggle('active', view === 'monthly');
    load();
  }

  function shiftCursor(direction) {
    cursor = view === 'weekly' ? addDays(cursor, direction * 7) : new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
    load();
  }

  async function load() {
    const rangeStart = view === 'weekly' ? startOfWeek(cursor) : startOfMonth(cursor);
    const rangeEnd = view === 'weekly' ? addDays(rangeStart, 6) : endOfMonth(cursor);
    label.textContent = view === 'weekly'
      ? `${rangeStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${rangeEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      : formatMonthYear(cursor);

    showLoading(grid);
    try {
      const { days } = await api.get(`/tasks/calendar?start=${toISODate(rangeStart)}&end=${toISODate(rangeEnd)}`);
      occurrences = days;
      renderGrid(rangeStart, rangeEnd);
    } catch (err) {
      grid.innerHTML = '';
      grid.appendChild(el('div', { class: 'error-state' }, [err instanceof ApiError ? err.message : 'Could not load calendar']));
    }
  }

  function renderGrid(rangeStart, rangeEnd) {
    grid.innerHTML = '';
    const hasAny = Object.keys(occurrences).length > 0;

    if (view === 'monthly') {
      const gridStart = startOfWeek(rangeStart);
      const weekday = el('div', { class: 'calendar-weekday-row' },
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => el('span', [d])));
      grid.appendChild(weekday);
      const cellsWrap = el('div', { class: 'calendar-cells' });
      let d = gridStart;
      for (let i = 0; i < 42 && d <= addDays(rangeEnd, 7); i++) {
        cellsWrap.appendChild(dayCell(d, occurrences, selectDay, selectedDay));
        d = addDays(d, 1);
        if (d > rangeEnd && d.getDay() === 0 && i > 27) break;
      }
      grid.appendChild(cellsWrap);
    } else {
      const cellsWrap = el('div', { class: 'calendar-cells calendar-cells-week' });
      let d = rangeStart;
      for (let i = 0; i < 7; i++) {
        cellsWrap.appendChild(dayCell(d, occurrences, selectDay, selectedDay));
        d = addDays(d, 1);
      }
      grid.appendChild(cellsWrap);
    }

    if (!hasAny) {
      dayDetail.innerHTML = '';
      dayDetail.appendChild(emptyState());
    } else {
      selectDay(selectedDay);
    }
  }

  const STATUS_META = {
    completed: { icon: '✅', label: 'Done' },
    skipped: { icon: '⏭️', label: 'Skipped' },
    missed: { icon: '❌', label: 'Missed' },
    pending: { icon: '⏳', label: '' },
  };

  function selectDay(key) {
    selectedDay = key;
    dayDetail.innerHTML = '';
    const items = occurrences[key] || [];
    dayDetail.appendChild(el('h3', { class: 'day-detail-heading' }, [key]));
    if (!items.length) {
      dayDetail.appendChild(el('p', { class: 'day-detail-empty' }, ['Nothing scheduled for this day.']));
    } else {
      items.forEach((item) => {
        const meta = STATUS_META[item.status] || STATUS_META.pending;
        dayDetail.appendChild(el('div', {
          class: `day-detail-item day-detail-item-${item.status}`,
          onclick: () => navigate(`/tasks/${item.taskId}`),
        }, [
          el('span', { class: 'day-detail-icon' }, [meta.icon]),
          el('span', [item.name]),
          item.reminderTime ? el('span', { class: 'day-detail-time' }, [item.reminderTime]) : null,
          meta.label ? el('span', { class: 'day-detail-status-label' }, [meta.label]) : null,
        ]));
      });
    }
    grid.querySelectorAll('.calendar-day').forEach((n) => n.classList.remove('selected'));
    const target = grid.querySelector(`.calendar-day[data-key="${key}"]`);
    if (target) target.classList.add('selected');
  }

  await load();
  return main;
}
