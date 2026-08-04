import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'routism.sqlite');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expires_at TEXT,
  theme TEXT NOT NULL DEFAULT 'classic',
  time_format TEXT NOT NULL DEFAULT '12h',
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  subscription_expires_at TEXT,
  trial_ends_at TEXT,
  rewarded_ads_used INTEGER NOT NULL DEFAULT 0,
  is_founder INTEGER NOT NULL DEFAULT 0,
  founder_number INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  recurrence_type TEXT NOT NULL DEFAULT 'daily',
  recurrence_config TEXT NOT NULL DEFAULT '{}',
  reminder_time TEXT,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  next_occurrence TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_next_occurrence ON tasks(next_occurrence);

CREATE TABLE IF NOT EXISTS task_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  occurrence_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(task_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_completions_user ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_task ON task_completions(task_id);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '{}',
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, type)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  subscription_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS founder_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  purchase_number INTEGER NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    logger.info(`Migrated: added ${table}.${column}`);
  }
}

export function runMigrations() {
  db.exec(SCHEMA);
  // Databases created before the status column was introduced need it added explicitly —
  // CREATE TABLE IF NOT EXISTS above won't alter a table that already exists. This must
  // run BEFORE the index below, since the index references the column.
  ensureColumn('task_completions', 'status', "TEXT NOT NULL DEFAULT 'completed'");
  db.exec('CREATE INDEX IF NOT EXISTS idx_completions_status ON task_completions(status)');
  logger.info('Database schema is up to date', { path: DB_PATH });
}

export function closeDatabase() {
  db.close();
}
