export const API_BASE = '/api';

export const THEMES = [
  { id: 'classic', label: 'Classic' },
  { id: 'dark', label: 'Dark' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
];

export const TIME_FORMATS = [
  { id: '12h', label: '12-hour (AM/PM)' },
  { id: '24h', label: '24-hour' },
];

export const RECURRENCE_TYPES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
  { id: 'custom', label: 'Custom' },
];

export const WEEKDAYS = [
  { id: 0, label: 'Sun', short: 'S' },
  { id: 1, label: 'Mon', short: 'M' },
  { id: 2, label: 'Tue', short: 'T' },
  { id: 3, label: 'Wed', short: 'W' },
  { id: 4, label: 'Thu', short: 'T' },
  { id: 5, label: 'Fri', short: 'F' },
  { id: 6, label: 'Sat', short: 'S' },
];

export const PREMIUM_PLANS = [
  { id: 'monthly', label: 'Monthly', price: 4.35, period: '/mo' },
  { id: 'yearly', label: 'Yearly', price: 43.52, period: '/yr' },
  { id: 'founder', label: 'Founder Lifetime', price: 72.52, period: 'one-time' },
];

export const AUTH_TOKEN_KEY = 'routism_token';
export const NOTIFICATIONS_MAX_REWARDED_ADS = 3;
