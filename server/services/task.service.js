import { db } from '../db/database.js';
import { AppError } from '../middleware/error.js';
import { computeNextOccurrence, computeOccurrencesInRange } from '../utils/recurrence.js';
import { checkAndUnlockAchievements } from './achievement.service.js';

function serializeTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    recurrenceType: row.recurrence_type,
    recurrenceConfig: JSON.parse(row.recurrence_config || '{}'),
    reminderTime: row.reminder_time,
    notificationsEnabled: !!row.notifications_enabled,
    status: row.status,
    nextOccurrence: row.next_occurrence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getOwnedTask(taskId, userId) {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, userId);
  if (!row) throw new AppError('Task not found', 404);
  return row;
}

export function createTask(userId, input) {
  const config = JSON.stringify(input.recurrenceConfig || {});
  const next = computeNextOccurrence(input.recurrenceType, input.recurrenceConfig || {}, new Date(), true);

  const result = db.prepare(`
    INSERT INTO tasks (user_id, name, description, recurrence_type, recurrence_config, reminder_time, notifications_enabled, next_occurrence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    input.name,
    input.description || null,
    input.recurrenceType,
    config,
    input.reminderTime || null,
    input.notificationsEnabled === false ? 0 : 1,
    next.toISOString()
  );

  return serializeTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid));
}

export function listTasks(userId, { status } = {}) {
  syncMissedOccurrences(userId);
  const rows = status
    ? db.prepare('SELECT * FROM tasks WHERE user_id = ? AND status = ? ORDER BY next_occurrence ASC').all(userId, status)
    : db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY next_occurrence ASC').all(userId);
  return rows.map(serializeTask);
}

export function getTask(userId, taskId) {
  return serializeTask(getOwnedTask(taskId, userId));
}

export function updateTask(userId, taskId, input) {
  const existing = getOwnedTask(taskId, userId);

  const name = input.name ?? existing.name;
  const description = input.description ?? existing.description;
  const recurrenceType = input.recurrenceType ?? existing.recurrence_type;
  const recurrenceConfig = input.recurrenceConfig ?? JSON.parse(existing.recurrence_config || '{}');
  const reminderTime = input.reminderTime ?? existing.reminder_time;
  const notificationsEnabled = input.notificationsEnabled ?? !!existing.notifications_enabled;

  const next = computeNextOccurrence(recurrenceType, recurrenceConfig, new Date(), true);

  db.prepare(`
    UPDATE tasks SET name = ?, description = ?, recurrence_type = ?, recurrence_config = ?,
      reminder_time = ?, notifications_enabled = ?, next_occurrence = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name, description, recurrenceType, JSON.stringify(recurrenceConfig),
    reminderTime, notificationsEnabled ? 1 : 0, next.toISOString(), taskId
  );

  return serializeTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId));
}

export function deleteTask(userId, taskId) {
  getOwnedTask(taskId, userId);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  return { deleted: true };
}

export function setTaskStatus(userId, taskId, status) {
  getOwnedTask(taskId, userId);
  db.prepare("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, taskId);
  return serializeTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Walk every active task's next_occurrence forward past any days that have
 * fully elapsed without the user completing or skipping them, logging a
 * 'missed' record for each one. Called lazily whenever a user's tasks are
 * read or acted on, so there's no dependency on a background job having run
 * recently — the moment the app is opened, the state catches up.
 */
export function syncMissedOccurrences(userId) {
  const today = todayISO();
  const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND status = 'active' AND next_occurrence IS NOT NULL").all(userId);

  const insertMissed = db.prepare(`
    INSERT OR IGNORE INTO task_completions (task_id, user_id, occurrence_date, status, completed_at)
    VALUES (?, ?, ?, 'missed', datetime('now'))
  `);
  const updateNext = db.prepare("UPDATE tasks SET next_occurrence = ?, updated_at = datetime('now') WHERE id = ?");

  for (const task of tasks) {
    const config = JSON.parse(task.recurrence_config || '{}');
    let occurrenceDate = task.next_occurrence.slice(0, 10);
    let cursor = new Date(task.next_occurrence);
    let advanced = false;
    let guard = 0;

    // Bounded to 200 iterations so a task left unopened for years can't loop unbounded.
    while (occurrenceDate < today && guard < 200) {
      insertMissed.run(task.id, userId, occurrenceDate);
      cursor = computeNextOccurrence(task.recurrence_type, config, cursor, false);
      occurrenceDate = cursor.toISOString().slice(0, 10);
      advanced = true;
      guard++;
    }

    if (advanced) updateNext.run(cursor.toISOString(), task.id);
  }
}

function recordOccurrence(userId, taskId, status, { checkAchievements } = {}) {
  const task = getOwnedTask(taskId, userId);
  const occurrenceDate = (task.next_occurrence || new Date().toISOString()).slice(0, 10);

  const already = db.prepare('SELECT id FROM task_completions WHERE task_id = ? AND occurrence_date = ?')
    .get(taskId, occurrenceDate);
  if (already) throw new AppError(`This occurrence is already marked ${already.status || 'complete'}`, 409);

  db.prepare('INSERT INTO task_completions (task_id, user_id, occurrence_date, status) VALUES (?, ?, ?, ?)')
    .run(taskId, userId, occurrenceDate, status);

  const config = JSON.parse(task.recurrence_config || '{}');
  const next = computeNextOccurrence(task.recurrence_type, config, new Date(task.next_occurrence || Date.now()), false);
  db.prepare("UPDATE tasks SET next_occurrence = ?, updated_at = datetime('now') WHERE id = ?")
    .run(next.toISOString(), taskId);

  const unlocked = checkAchievements ? checkAndUnlockAchievements(userId) : [];

  return {
    task: serializeTask(db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId)),
    unlockedAchievements: unlocked,
  };
}

export function completeTask(userId, taskId) {
  syncMissedOccurrences(userId);
  return recordOccurrence(userId, taskId, 'completed', { checkAchievements: true });
}

export function skipTask(userId, taskId) {
  syncMissedOccurrences(userId);
  return recordOccurrence(userId, taskId, 'skipped', { checkAchievements: false });
}

export function getCompletionHistory(userId, taskId, limit = 50) {
  getOwnedTask(taskId, userId);
  return db.prepare(
    'SELECT occurrence_date, status, completed_at FROM task_completions WHERE task_id = ? ORDER BY occurrence_date DESC LIMIT ?'
  ).all(taskId, limit);
}

export function getCalendarOccurrences(userId, rangeStartISO, rangeEndISO) {
  syncMissedOccurrences(userId);
  const rangeStart = new Date(rangeStartISO);
  const rangeEnd = new Date(rangeEndISO);
  const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND status = 'active'").all(userId);
  const statusByKey = new Map(
    db.prepare(`
      SELECT task_id || ':' || occurrence_date AS key, status FROM task_completions
      WHERE user_id = ? AND occurrence_date BETWEEN ? AND ?
    `).all(userId, rangeStart.toISOString().slice(0, 10), rangeEnd.toISOString().slice(0, 10))
      .map((r) => [r.key, r.status])
  );

  const days = {};
  const today = todayISO();
  for (const task of tasks) {
    const config = JSON.parse(task.recurrence_config || '{}');
    const occurrences = computeOccurrencesInRange(task.recurrence_type, config, rangeStart, rangeEnd);
    for (const occ of occurrences) {
      const key = occ.toISOString().slice(0, 10);
      if (!days[key]) days[key] = [];
      const recorded = statusByKey.get(`${task.id}:${key}`);
      days[key].push({
        taskId: task.id,
        name: task.name,
        reminderTime: task.reminder_time,
        status: recorded || (key < today ? 'missed' : 'pending'),
      });
    }
  }
  return days;
}
