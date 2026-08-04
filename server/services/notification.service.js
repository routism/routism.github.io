import webpush from 'web-push';
import { db } from '../db/database.js';
import { logger } from '../utils/logger.js';

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CONTACT_EMAIL } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn('VAPID keys are not configured; push notifications are disabled');
    return false;
  }
  webpush.setVapidDetails(
    `mailto:${VAPID_CONTACT_EMAIL || 'support@routism.app'}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
  return true;
}

export function getPublicVapidKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export function saveSubscription(userId, subscription) {
  if (!subscription || !subscription.endpoint) {
    throw new Error('Invalid push subscription payload');
  }
  db.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, subscription_json)
    VALUES (?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET subscription_json = excluded.subscription_json
  `).run(userId, subscription.endpoint, JSON.stringify(subscription));
  return { saved: true };
}

export function removeSubscription(endpoint) {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  return { removed: true };
}

export async function sendNotificationToUser(userId, payload) {
  if (!ensureConfigured()) return { sent: 0 };

  const subs = db.prepare('SELECT endpoint, subscription_json FROM push_subscriptions WHERE user_id = ?').all(userId);
  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(JSON.parse(sub.subscription_json), JSON.stringify(payload));
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        removeSubscription(sub.endpoint);
      } else {
        logger.warn('Push notification failed', { message: err.message });
      }
    }
  }
  return { sent };
}

export async function sendDueTaskReminders() {
  if (!ensureConfigured()) return { sent: 0 };

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 5 * 60 * 1000);

  const dueTasks = db.prepare(`
    SELECT * FROM tasks
    WHERE status = 'active' AND notifications_enabled = 1
      AND next_occurrence BETWEEN ? AND ?
  `).all(now.toISOString(), windowEnd.toISOString());

  let totalSent = 0;
  for (const task of dueTasks) {
    const result = await sendNotificationToUser(task.user_id, {
      title: 'Routism reminder',
      body: `Time for: ${task.name}`,
      taskId: task.id,
    });
    totalSent += result.sent;
  }
  return { sent: totalSent, tasksChecked: dueTasks.length };
}
