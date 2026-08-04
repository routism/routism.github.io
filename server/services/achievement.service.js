import { db } from '../db/database.js';

const DEFINITIONS = [
  { type: 'first_completion', label: 'First Step', description: 'Completed your first routine.' },
  { type: 'streak_7', label: '7-Day Streak', description: 'Completed routines 7 days in a row.' },
  { type: 'streak_30', label: '30-Day Streak', description: 'Completed routines 30 days in a row.' },
  { type: 'tasks_10_completed', label: 'Getting Consistent', description: 'Completed 10 total routine occurrences.' },
  { type: 'tasks_100_completed', label: 'Century Club', description: 'Completed 100 total routine occurrences.' },
];

function computeCurrentStreak(userId) {
  const rows = db.prepare(
    "SELECT DISTINCT occurrence_date FROM task_completions WHERE user_id = ? AND status = 'completed' ORDER BY occurrence_date DESC"
  ).all(userId);
  if (!rows.length) return 0;

  let streak = 0;
  let cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);

  const dates = new Set(rows.map((r) => r.occurrence_date));
  // Allow the streak to count from today or yesterday (in case today's tasks aren't done yet).
  if (!dates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function totalCompletions(userId) {
  return db.prepare("SELECT COUNT(*) AS n FROM task_completions WHERE user_id = ? AND status = 'completed'").get(userId).n;
}

export function checkAndUnlockAchievements(userId) {
  const unlocked = [];
  const total = totalCompletions(userId);
  const streak = computeCurrentStreak(userId);

  const toCheck = [];
  if (total >= 1) toCheck.push('first_completion');
  if (total >= 10) toCheck.push('tasks_10_completed');
  if (total >= 100) toCheck.push('tasks_100_completed');
  if (streak >= 7) toCheck.push('streak_7');
  if (streak >= 30) toCheck.push('streak_30');

  const insert = db.prepare('INSERT OR IGNORE INTO achievements (user_id, type, meta) VALUES (?, ?, ?)');
  for (const type of toCheck) {
    const result = insert.run(userId, type, JSON.stringify({ total, streak }));
    if (result.changes > 0) {
      const def = DEFINITIONS.find((d) => d.type === type);
      unlocked.push(def);
    }
  }
  return unlocked;
}

export function listAchievements(userId) {
  const rows = db.prepare('SELECT type, unlocked_at FROM achievements WHERE user_id = ? ORDER BY unlocked_at DESC').all(userId);
  const unlockedTypes = new Set(rows.map((r) => r.type));
  return DEFINITIONS.map((def) => ({
    ...def,
    unlocked: unlockedTypes.has(def.type),
    unlockedAt: rows.find((r) => r.type === def.type)?.unlocked_at || null,
  }));
}

export function getCurrentStreak(userId) {
  return computeCurrentStreak(userId);
}
