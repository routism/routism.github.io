import { db } from '../db/database.js';
import { getCurrentStreak } from './achievement.service.js';
import { syncMissedOccurrences } from './task.service.js';
import { computeOccurrencesInRange } from '../utils/recurrence.js';

function hasAnyOccurrenceRecord(userId) {
  const row = db.prepare('SELECT COUNT(*) AS n FROM task_completions WHERE user_id = ?').get(userId);
  return row.n > 0;
}

function expectedOccurrencesInRange(userId, rangeStart, rangeEnd) {
  const tasks = db.prepare("SELECT * FROM tasks WHERE user_id = ? AND status = 'active'").all(userId);
  let expected = 0;
  const perTask = {};
  for (const task of tasks) {
    const config = JSON.parse(task.recurrence_config || '{}');
    const occurrences = computeOccurrencesInRange(task.recurrence_type, config, rangeStart, rangeEnd);
    expected += occurrences.length;
    perTask[task.id] = { name: task.name, expected: occurrences.length };
  }
  return { expected, perTask, tasks };
}

export function getInsightsSummary(userId) {
  syncMissedOccurrences(userId);

  if (!hasAnyOccurrenceRecord(userId)) {
    return { hasData: false };
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const monthStart = new Date(now);
  monthStart.setUTCDate(monthStart.getUTCDate() - 29);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const nowStr = now.toISOString().slice(0, 10);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const { expected: weekExpected, perTask } = expectedOccurrencesInRange(userId, weekStart, now);

  const weekCounts = db.prepare(`
    SELECT status, COUNT(*) AS n FROM task_completions
    WHERE user_id = ? AND occurrence_date BETWEEN ? AND ?
    GROUP BY status
  `).all(userId, weekStartStr, nowStr);
  const weekCompleted = weekCounts.find((r) => r.status === 'completed')?.n || 0;
  const weekMissed = weekCounts.find((r) => r.status === 'missed')?.n || 0;
  const weekSkipped = weekCounts.find((r) => r.status === 'skipped')?.n || 0;

  const completionsByTask = db.prepare(`
    SELECT task_id, COUNT(*) AS n FROM task_completions
    WHERE user_id = ? AND status = 'completed' AND occurrence_date BETWEEN ? AND ?
    GROUP BY task_id
  `).all(userId, weekStartStr, nowStr);

  let mostConsistent = null;
  let bestRate = -1;
  for (const row of completionsByTask) {
    const meta = perTask[row.task_id];
    if (!meta || meta.expected === 0) continue;
    const rate = row.n / meta.expected;
    if (rate > bestRate) {
      bestRate = rate;
      mostConsistent = meta.name;
    }
  }

  const recentMissed = db.prepare(`
    SELECT tc.occurrence_date, t.id AS task_id, t.name FROM task_completions tc
    JOIN tasks t ON t.id = tc.task_id
    WHERE tc.user_id = ? AND tc.status = 'missed'
    ORDER BY tc.occurrence_date DESC
    LIMIT 10
  `).all(userId);

  const monthlyOccurrences = expectedOccurrencesInRange(userId, monthStart, now).expected;
  const monthlyCompletedRow = db.prepare(
    "SELECT COUNT(*) AS n FROM task_completions WHERE user_id = ? AND status = 'completed' AND occurrence_date BETWEEN ? AND ?"
  ).get(userId, monthStartStr, nowStr);

  return {
    hasData: true,
    completionRate: weekExpected > 0 ? Math.round((weekCompleted / weekExpected) * 100) : 0,
    weeklyScore: weekCompleted,
    weeklyExpected: weekExpected,
    weeklyMissed: weekMissed,
    weeklySkipped: weekSkipped,
    currentStreak: getCurrentStreak(userId),
    mostConsistentRoutine: mostConsistent,
    missedRoutines: recentMissed.map((m) => ({ id: m.task_id, name: m.name, occurrenceDate: m.occurrence_date })),
    monthlyTrend: {
      expected: monthlyOccurrences,
      completed: monthlyCompletedRow.n,
      rate: monthlyOccurrences > 0 ? Math.round((monthlyCompletedRow.n / monthlyOccurrences) * 100) : 0,
    },
  };
}

export function getCompletionHistoryForExport(userId, limit = 500) {
  return db.prepare(`
    SELECT tc.occurrence_date, tc.status, tc.completed_at, t.name AS task_name
    FROM task_completions tc
    JOIN tasks t ON t.id = tc.task_id
    WHERE tc.user_id = ?
    ORDER BY tc.occurrence_date DESC
    LIMIT ?
  `).all(userId, limit);
}
