/**
 * Recurrence engine for Routism tasks.
 *
 * recurrenceConfig shapes by type:
 *   daily:   { interval: number }                         every N days
 *   weekly:  { interval: number, daysOfWeek: number[] }    0=Sun..6=Sat
 *   monthly: { interval: number, dayOfMonth: number }      1-31 (clamped to month length)
 *   yearly:  { interval: number, month: number, day: number } month 1-12
 *   custom:  { interval: number, unit: 'days'|'weeks' }
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function toUTCDate(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysInMonth(year, monthIndex0) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function addDays(date, n) {
  return new Date(date.getTime() + n * DAY_MS);
}

function addMonths(date, n) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + n;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), daysInMonth(targetYear, targetMonth));
  return new Date(Date.UTC(targetYear, targetMonth, day));
}

/**
 * Compute the next occurrence strictly after `fromDate` (or the first
 * occurrence on/after `fromDate` if `inclusive` is true).
 */
export function computeNextOccurrence(recurrenceType, recurrenceConfig, fromDate, inclusive = false) {
  const cfg = recurrenceConfig || {};
  const interval = Math.max(1, cfg.interval || 1);
  const start = toUTCDate(fromDate);

  switch (recurrenceType) {
    case 'daily': {
      return inclusive ? start : addDays(start, interval);
    }

    case 'weekly': {
      const days = Array.isArray(cfg.daysOfWeek) && cfg.daysOfWeek.length ? cfg.daysOfWeek : [start.getUTCDay()];
      const sorted = [...days].sort((a, b) => a - b);
      let cursor = inclusive ? start : addDays(start, 1);
      for (let i = 0; i < 7 * Math.max(1, interval) + 7; i++) {
        if (sorted.includes(cursor.getUTCDay())) return cursor;
        cursor = addDays(cursor, 1);
      }
      return addDays(start, 7 * interval);
    }

    case 'monthly': {
      const dayOfMonth = cfg.dayOfMonth || start.getUTCDate();
      let candidate = new Date(Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        Math.min(dayOfMonth, daysInMonth(start.getUTCFullYear(), start.getUTCMonth()))
      ));
      if (inclusive && candidate.getTime() >= start.getTime()) return candidate;
      if (!inclusive && candidate.getTime() > start.getTime()) return candidate;
      return addMonths(candidate, interval);
    }

    case 'yearly': {
      const month = (cfg.month || start.getUTCMonth() + 1) - 1;
      const day = cfg.day || start.getUTCDate();
      let year = start.getUTCFullYear();
      let candidate = new Date(Date.UTC(year, month, Math.min(day, daysInMonth(year, month))));
      if (inclusive && candidate.getTime() >= start.getTime()) return candidate;
      if (!inclusive && candidate.getTime() > start.getTime()) return candidate;
      year += interval;
      return new Date(Date.UTC(year, month, Math.min(day, daysInMonth(year, month))));
    }

    case 'custom': {
      const unit = cfg.unit === 'weeks' ? 7 : 1;
      const step = interval * unit;
      return inclusive ? start : addDays(start, step);
    }

    default:
      return inclusive ? start : addDays(start, 1);
  }
}

/**
 * Compute a run of upcoming occurrences (for calendar rendering).
 */
export function computeOccurrencesInRange(recurrenceType, recurrenceConfig, rangeStart, rangeEnd) {
  const occurrences = [];
  let cursor = computeNextOccurrence(recurrenceType, recurrenceConfig, rangeStart, true);
  let guard = 0;
  while (cursor.getTime() <= rangeEnd.getTime() && guard < 500) {
    occurrences.push(new Date(cursor));
    cursor = computeNextOccurrence(recurrenceType, recurrenceConfig, cursor, false);
    guard++;
  }
  return occurrences;
}
