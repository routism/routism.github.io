import { el, toast, showLoading } from '../utils/dom.js';
import { renderShell } from '../shell.js';
import { navigate } from '../router.js';
import { api, ApiError } from '../api.js';
import { getState, setTasks, upsertTask } from '../state.js';
import { recurrenceSummary, initials } from '../utils/formatters.js';
import { formatTime, relativeDay, parseISODate, toISODate } from '../utils/date.js';

const MOTIVATION = [
  "Small steps, repeated daily, build the life you're after.",
  "You don't need more willpower — you need a system. That's why you're here.",
  "Consistency beats intensity. Show up today, even a little.",
  "Every routine you keep is a promise you're keeping to yourself.",
  "Progress hides in the boring, repeatable stuff. Nice work showing up.",
  "The goal isn't perfection — it's not missing twice in a row.",
  "Future you is being built by what you do today.",
  "Habits are votes for the person you want to become.",
  "One checkmark at a time. That's the whole game.",
  "You're not starting over — you're continuing. Keep going.",
  "Discipline is just self-respect in action.",
  "The best routine is the one you actually stick to. You're sticking to yours.",
  "Momentum is built in quiet, unremarkable moments — like this one.",
  "You showed up. That's the hard part. The rest is just doing the thing.",
];

function quoteOfTheDay() {
  const startOfYear = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((new Date() - startOfYear) / 86400000);
  return MOTIVATION[dayOfYear % MOTIVATION.length];
}

function emptyState() {
  return el('div', { class: 'empty-state' }, [
    el('div', { class: 'empty-state-illustration' }, ['🌱']),
    el('h2', ['Create Your First Routine']),
    el('p', ['Set a task once and Routism keeps it running — reminders, recurrence, and progress, all automatic.']),
    el('button', { class: 'btn btn-primary', onclick: () => navigate('/tasks/new') }, ['Create Your First Routine']),
  ]);
}

function taskCard(task) {
  const { timeFormat } = getState();
  return el('div', { class: 'task-card', onclick: () => navigate(`/tasks/${task.id}`) }, [
    el('button', {
      class: `task-checkbox${task.status === 'paused' ? ' disabled' : ''}`,
      'aria-label': 'Complete task',
      onclick: async (e) => {
        e.stopPropagation();
        if (task.status === 'paused') return;
        try {
          const { task: updated, unlockedAchievements } = await api.post(`/tasks/${task.id}/complete`, {});
          upsertTask(updated);
          toast('Nice work! Marked complete. 🎉');
          if (unlockedAchievements?.length) {
            setTimeout(() => toast(`Achievement unlocked: ${unlockedAchievements[0].label}`), 900);
          }
        } catch (err) {
          toast(err instanceof ApiError ? err.message : 'Could not complete task', { type: 'error' });
        }
      },
    }, ['✓']),
    el('div', { class: 'task-card-body' }, [
      el('div', { class: 'task-card-name' }, [task.name]),
      el('div', { class: 'task-card-meta' }, [
        task.reminderTime ? el('span', ['⏰ ', formatTime(task.reminderTime, timeFormat)]) : null,
        el('span', { class: 'recurrence-badge' }, [recurrenceSummary(task.recurrenceType, task.recurrenceConfig)]),
        task.nextOccurrence ? el('span', { class: 'next-occurrence' }, [relativeDay(parseISODate(task.nextOccurrence.slice(0, 10)))]) : null,
      ]),
    ]),
    task.status === 'paused' ? el('span', { class: 'paused-tag' }, ['Paused']) : null,
  ]);
}

export async function renderDashboard(root) {
  const timeOfDayGreeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const { user } = getState();
  const firstName = user?.name ? user.name.split(' ')[0] : null;

  const content = el('div', { class: 'dashboard-screen' }, [
    el('div', { class: 'dashboard-hero' }, [
      el('div', { class: 'hero-top' }, [
        el('div', { class: 'hero-avatar' }, [initials(user?.name || user?.email || '?')]),
        el('div', { class: 'hero-greeting-block' }, [
          el('h2', { class: 'hero-greeting' }, [`Welcome back${firstName ? ', ' + firstName : ''}`]),
          el('p', { class: 'dashboard-date' }, [`${timeOfDayGreeting} · ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}`]),
        ]),
      ]),
      el('div', { id: 'hero-stats', class: 'hero-stats-row' }),
      el('p', { class: 'hero-quote' }, [`"${quoteOfTheDay()}"`]),
    ]),
    el('div', { id: 'task-list', class: 'task-list' }),
  ]);

  const main = renderShell(root, { title: 'Routism', activePath: '/dashboard', content });
  const listContainer = content.querySelector('#task-list');
  const statsRow = content.querySelector('#hero-stats');
  showLoading(listContainer);

  try {
    const { tasks } = await api.get('/tasks?status=active');
    setTasks(tasks);
    listContainer.innerHTML = '';
    if (!tasks.length) {
      listContainer.appendChild(emptyState());
    } else {
      tasks.forEach((task) => listContainer.appendChild(taskCard(task)));
    }

    const today = toISODate(new Date());
    const dueToday = tasks.filter((t) => t.nextOccurrence && t.nextOccurrence.slice(0, 10) === today).length;
    if (dueToday > 0) {
      statsRow.appendChild(el('span', { class: 'hero-pill' }, [`📋 ${dueToday} due today`]));
    }
  } catch (err) {
    listContainer.innerHTML = '';
    listContainer.appendChild(el('div', { class: 'error-state' }, [err instanceof ApiError ? err.message : 'Could not load your routines.']));
  }

  // Streak is best-effort: there may be no completion history yet, which is fine — just skip the badge.
  try {
    const summary = await api.get('/insights');
    if (summary.hasData && summary.currentStreak > 0) {
      statsRow.appendChild(el('span', { class: 'hero-pill hero-pill-streak' }, [`🔥 ${summary.currentStreak}-day streak`]));
    }
  } catch {
    /* insights unavailable — hero still works without the streak pill */
  }

  return main;
}

