import { db } from '../db/database.js';
import { AppError } from '../middleware/error.js';
import { publicUser } from './auth.service.js';

const THEMES = ['classic', 'dark', 'ocean', 'forest'];
const TIME_FORMATS = ['12h', '24h'];

export function updateProfile(userId, { name }) {
  db.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?").run(name, userId);
  return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId));
}

export function updatePreferences(userId, { theme, timeFormat }) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new AppError('User not found', 404);

  const nextTheme = theme && THEMES.includes(theme) ? theme : user.theme;
  const nextFormat = timeFormat && TIME_FORMATS.includes(timeFormat) ? timeFormat : user.time_format;

  db.prepare("UPDATE users SET theme = ?, time_format = ?, updated_at = datetime('now') WHERE id = ?")
    .run(nextTheme, nextFormat, userId);

  return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(userId));
}

export function deleteAccount(userId) {
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return { deleted: true };
}

export const AVAILABLE_THEMES = THEMES;
export const AVAILABLE_TIME_FORMATS = TIME_FORMATS;
