import { db } from '../db/database.js';
import { AppError } from '../middleware/error.js';

export const PRICING = {
  monthly: { amount: 4.35, currency: 'USD' },
  yearly: { amount: 43.52, currency: 'USD' },
  founder: { amount: 72.52, currency: 'USD' },
};

const MAX_REWARDED_ADS = 3;
const REWARD_DAYS_PER_AD = 3;
const FOUNDER_LIMIT = 1000;

function isActive(user) {
  const now = Date.now();
  if (user.subscription_tier === 'founder') return true;
  if (user.trial_ends_at && new Date(user.trial_ends_at).getTime() > now) return true;
  if (user.subscription_expires_at && new Date(user.subscription_expires_at).getTime() > now) return true;
  return false;
}

export function getPremiumStatus(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new AppError('User not found', 404);

  const founderCount = db.prepare('SELECT COUNT(*) AS n FROM founder_purchases').get().n;

  return {
    tier: user.subscription_tier,
    isActive: isActive(user),
    isFounder: !!user.is_founder,
    founderNumber: user.founder_number,
    founderSlotsRemaining: Math.max(0, FOUNDER_LIMIT - founderCount),
    founderSlotsTotal: FOUNDER_LIMIT,
    trialEndsAt: user.trial_ends_at,
    subscriptionExpiresAt: user.subscription_expires_at,
    rewardedAdsUsed: user.rewarded_ads_used,
    rewardedAdsRemaining: Math.max(0, MAX_REWARDED_ADS - user.rewarded_ads_used),
    pricing: PRICING,
  };
}

export function watchRewardedAd(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new AppError('User not found', 404);

  if (user.rewarded_ads_used >= MAX_REWARDED_ADS) {
    throw new AppError('You have used all available rewarded ad extensions', 400);
  }

  const base = user.trial_ends_at && new Date(user.trial_ends_at).getTime() > Date.now()
    ? new Date(user.trial_ends_at)
    : new Date();
  base.setDate(base.getDate() + REWARD_DAYS_PER_AD);

  db.prepare('UPDATE users SET trial_ends_at = ?, rewarded_ads_used = rewarded_ads_used + 1 WHERE id = ?')
    .run(base.toISOString(), userId);

  return getPremiumStatus(userId);
}

export function subscribe(userId, plan) {
  if (!PRICING[plan]) throw new AppError('Unknown plan', 400);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) throw new AppError('User not found', 404);

  if (plan === 'founder') {
    const founderCount = db.prepare('SELECT COUNT(*) AS n FROM founder_purchases').get().n;
    if (founderCount >= FOUNDER_LIMIT) {
      throw new AppError('The Founder Lifetime plan is sold out', 400);
    }
    const tx = db.transaction(() => {
      const result = db.prepare('INSERT INTO founder_purchases (user_id, purchase_number) VALUES (?, ?)')
        .run(userId, founderCount + 1);
      db.prepare("UPDATE users SET subscription_tier = 'founder', is_founder = 1, founder_number = ? WHERE id = ?")
        .run(founderCount + 1, userId);
      return result;
    });
    tx();
    return getPremiumStatus(userId);
  }

  const expires = new Date();
  if (plan === 'monthly') expires.setMonth(expires.getMonth() + 1);
  if (plan === 'yearly') expires.setFullYear(expires.getFullYear() + 1);

  db.prepare("UPDATE users SET subscription_tier = ?, subscription_expires_at = ? WHERE id = ?")
    .run(plan, expires.toISOString(), userId);

  return getPremiumStatus(userId);
}
