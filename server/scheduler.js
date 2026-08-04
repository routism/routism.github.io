import { sendDueTaskReminders } from './services/notification.service.js';
import { logger } from './utils/logger.js';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let intervalHandle = null;

async function tick() {
  try {
    const result = await sendDueTaskReminders();
    if (result.sent > 0) {
      logger.info('Sent reminder notifications', result);
    }
  } catch (err) {
    logger.error('Scheduler tick failed', { message: err.message });
  }
}

export function startScheduler() {
  if (intervalHandle) return;
  logger.info('Reminder scheduler started', { intervalMinutes: CHECK_INTERVAL_MS / 60000 });
  intervalHandle = setInterval(tick, CHECK_INTERVAL_MS);
  // Run once shortly after boot so reminders due right now aren't missed.
  setTimeout(tick, 10_000);
}

export function stopScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
