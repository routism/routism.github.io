import { el, toast } from '../utils/dom.js';
import { renderShell } from '../shell.js';
import { navigate } from '../router.js';
import { api, ApiError } from '../api.js';
import { upsertTask } from '../state.js';
import { RECURRENCE_TYPES, WEEKDAYS } from '../utils/constants.js';
import { isNonEmpty } from '../utils/validators.js';

function recurrenceFields(type, config) {
  if (type === 'weekly') {
    return el('div', { class: 'weekday-picker' },
      WEEKDAYS.map((day) =>
        el('button', {
          type: 'button',
          class: `weekday-chip${(config.daysOfWeek || []).includes(day.id) ? ' selected' : ''}`,
          dataset: { day: day.id },
          onclick: (e) => e.currentTarget.classList.toggle('selected'),
        }, [day.short])
      )
    );
  }
  if (type === 'monthly') {
    return el('label', { class: 'field' }, [
      el('span', { class: 'field-label' }, ['Day of month']),
      el('input', { class: 'field-input', type: 'number', id: 'day-of-month', min: 1, max: 31, value: config.dayOfMonth || 1 }),
    ]);
  }
  if (type === 'yearly') {
    return el('div', { class: 'field-row' }, [
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label' }, ['Month']),
        el('input', { class: 'field-input', type: 'number', id: 'yearly-month', min: 1, max: 12, value: config.month || 1 }),
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label' }, ['Day']),
        el('input', { class: 'field-input', type: 'number', id: 'yearly-day', min: 1, max: 31, value: config.day || 1 }),
      ]),
    ]);
  }
  if (type === 'custom') {
    return el('div', { class: 'field-row' }, [
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label' }, ['Every']),
        el('input', { class: 'field-input', type: 'number', id: 'custom-interval', min: 1, value: config.interval || 1 }),
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'field-label' }, ['Unit']),
        el('select', { class: 'field-input', id: 'custom-unit' }, [
          el('option', { value: 'days', selected: (config.unit || 'days') === 'days' }, ['Days']),
          el('option', { value: 'weeks', selected: config.unit === 'weeks' }, ['Weeks']),
        ]),
      ]),
    ]);
  }
  // daily
  return el('label', { class: 'field' }, [
    el('span', { class: 'field-label' }, ['Every N days']),
    el('input', { class: 'field-input', type: 'number', id: 'daily-interval', min: 1, value: config.interval || 1 }),
  ]);
}

function readRecurrenceConfig(type, form) {
  if (type === 'weekly') {
    const daysOfWeek = Array.from(form.querySelectorAll('.weekday-chip.selected')).map((n) => Number(n.dataset.day));
    return { daysOfWeek: daysOfWeek.length ? daysOfWeek : [new Date().getDay()] };
  }
  if (type === 'monthly') {
    return { dayOfMonth: Number(form.querySelector('#day-of-month')?.value || 1) };
  }
  if (type === 'yearly') {
    return {
      month: Number(form.querySelector('#yearly-month')?.value || 1),
      day: Number(form.querySelector('#yearly-day')?.value || 1),
    };
  }
  if (type === 'custom') {
    return {
      interval: Number(form.querySelector('#custom-interval')?.value || 1),
      unit: form.querySelector('#custom-unit')?.value || 'days',
    };
  }
  return { interval: Number(form.querySelector('#daily-interval')?.value || 1) };
}

export async function renderCreateTask(root, params) {
  const isEdit = !!params.id;
  let existing = null;
  if (isEdit) {
    try {
      const { task } = await api.get(`/tasks/${params.id}`);
      existing = task;
    } catch (err) {
      toast('Could not load task', { type: 'error' });
      navigate('/dashboard');
      return;
    }
  }

  const state = {
    type: existing?.recurrenceType || 'daily',
    config: existing?.recurrenceConfig || {},
  };

  const recurrenceContainer = el('div', { id: 'recurrence-fields' }, [recurrenceFields(state.type, state.config)]);

  const form = el('form', { class: 'task-form' }, [
    el('label', { class: 'field' }, [
      el('span', { class: 'field-label' }, ['Task name']),
      el('input', { class: 'field-input', id: 'task-name', type: 'text', placeholder: 'e.g. Morning workout', value: existing?.name || '', maxlength: 200 }),
    ]),
    el('label', { class: 'field' }, [
      el('span', { class: 'field-label' }, ['Description']),
      el('textarea', { class: 'field-input', id: 'task-description', rows: 3, placeholder: 'Optional details' }, [existing?.description || '']),
    ]),
    el('label', { class: 'field' }, [
      el('span', { class: 'field-label' }, ['Reminder time']),
      el('input', { class: 'field-input', id: 'task-reminder', type: 'time', value: existing?.reminderTime || '' }),
    ]),
    el('label', { class: 'field' }, [
      el('span', { class: 'field-label' }, ['Recurrence']),
      el('select', {
        class: 'field-input', id: 'task-recurrence',
        onchange: (e) => {
          state.type = e.target.value;
          recurrenceContainer.innerHTML = '';
          recurrenceContainer.appendChild(recurrenceFields(state.type, {}));
        },
      }, RECURRENCE_TYPES.map((r) => el('option', { value: r.id, selected: r.id === state.type }, [r.label]))),
    ]),
    recurrenceContainer,
    el('label', { class: 'field field-inline' }, [
      el('input', { type: 'checkbox', id: 'task-notifications', checked: existing ? existing.notificationsEnabled : true }),
      el('span', ['Enable notifications']),
    ]),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, [isEdit ? 'Save Changes' : 'Create Routine']),
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.querySelector('#task-name').value.trim();
    if (!isNonEmpty(name)) {
      toast('Task name is required', { type: 'error' });
      return;
    }

    const payload = {
      name,
      description: form.querySelector('#task-description').value.trim(),
      recurrenceType: form.querySelector('#task-recurrence').value,
      recurrenceConfig: readRecurrenceConfig(form.querySelector('#task-recurrence').value, form),
      reminderTime: form.querySelector('#task-reminder').value || null,
      notificationsEnabled: form.querySelector('#task-notifications').checked,
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const { task } = isEdit
        ? await api.put(`/tasks/${params.id}`, payload)
        : await api.post('/tasks', payload);
      upsertTask(task);
      toast(isEdit ? 'Routine updated' : 'Routine created!');
      navigate(isEdit ? `/tasks/${task.id}` : '/dashboard');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save routine', { type: 'error' });
    } finally {
      submitBtn.disabled = false;
    }
  });

  renderShell(root, {
    title: isEdit ? 'Edit Routine' : 'New Routine',
    activePath: '/tasks/new',
    showBack: true,
    content: form,
  });
}
