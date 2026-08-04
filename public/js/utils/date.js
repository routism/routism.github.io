const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Format a Date as a plain "YYYY-MM-DD" calendar-day string using its LOCAL
 * date components. Using toISOString() here would convert through UTC and
 * shift the date by a day for any timezone ahead of UTC (e.g. midnight local
 * on the 4th becomes 23:00 UTC on the 3rd) — that mismatch was the source of
 * the calendar's "click day 4, see day 3" bug.
 */
export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a "YYYY-MM-DD" string into a local midnight Date — the exact inverse
 * of toISODate. Deliberately does NOT go through UTC (see note above).
 */
export function parseISODate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatFriendlyDate(date) {
  return `${WEEKDAY_NAMES[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatMonthYear(date) {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format a "HH:MM" 24-hour time string per the user's preference.
 */
export function formatTime(hhmm, timeFormat = '12h') {
  if (!hhmm) return '';
  const [hStr, mStr] = hhmm.split(':');
  let hours = parseInt(hStr, 10);
  const minutes = mStr || '00';

  if (timeFormat === '24h') {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

export function isToday(date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
}

export function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function relativeDay(date) {
  const now = new Date();
  const diffDays = Math.round((new Date(date.toDateString()) - new Date(now.toDateString())) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return formatFriendlyDate(date);
}
