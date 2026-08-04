const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function timestamp() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  if (LEVELS[level] > currentLevel) return;
  const line = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  const payload = meta ? `${line} ${JSON.stringify(meta)}` : line;
  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.log(payload);
}

export const logger = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
