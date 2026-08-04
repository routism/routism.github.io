import { db } from '../db/database.js';
import { hashPassword, verifyPassword, randomToken } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../middleware/error.js';

const TRIAL_DAYS = 5;

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: !!row.email_verified,
    theme: row.theme,
    timeFormat: row.time_format,
    subscriptionTier: row.subscription_tier,
    subscriptionExpiresAt: row.subscription_expires_at,
    trialEndsAt: row.trial_ends_at,
    rewardedAdsUsed: row.rewarded_ads_used,
    isFounder: !!row.is_founder,
    founderNumber: row.founder_number,
    createdAt: row.created_at,
  };
}

export function signup({ email, password, name }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) throw new AppError('An account with this email already exists', 409);

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const verificationToken = randomToken(16);

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, name, trial_ends_at, subscription_tier, verification_token)
    VALUES (?, ?, ?, ?, 'trial', ?)
  `).run(email.toLowerCase(), hashPassword(password), name || null, trialEndsAt, verificationToken);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = signToken({ sub: user.id }, process.env.JWT_SECRET, 60 * 60 * 24 * 30);

  return { user: publicUser(user), token, verificationToken };
}

export function login({ email, password }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new AppError('Invalid email or password', 401);
  }
  const token = signToken({ sub: user.id }, process.env.JWT_SECRET, 60 * 60 * 24 * 30);
  return { user: publicUser(user), token };
}

export function verifyEmail(token) {
  const user = db.prepare('SELECT id FROM users WHERE verification_token = ?').get(token);
  if (!user) throw new AppError('Invalid or expired verification link', 400);
  db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
  return { verified: true };
}

export function requestPasswordReset(email) {
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  // Always behave the same whether or not the account exists, to avoid leaking which emails are registered.
  if (!user) return { resetToken: null };

  const resetToken = randomToken(16);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?')
    .run(resetToken, expiresAt, user.id);
  return { resetToken };
}

export function resetPassword({ token, newPassword }) {
  const user = db.prepare('SELECT id, reset_token_expires_at FROM users WHERE reset_token = ?').get(token);
  if (!user) throw new AppError('Invalid or expired reset link', 400);
  if (new Date(user.reset_token_expires_at).getTime() < Date.now()) {
    throw new AppError('This reset link has expired', 400);
  }
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL WHERE id = ?')
    .run(hashPassword(newPassword), user.id);
  return { reset: true };
}

export function getUserById(id) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return publicUser(user);
}

export { publicUser };
