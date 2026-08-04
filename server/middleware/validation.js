import { AppError } from './error.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECURRENCE_TYPES = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8;
}

export function validateBody(rules) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body ? req.body[field] : undefined;
      const isPresent = value !== undefined && value !== null && value !== '';

      if (rule.required && !isPresent) {
        errors.push(`${field} is required`);
        continue;
      }
      if (!isPresent) continue;

      if (rule.type === 'email' && !isValidEmail(value)) {
        errors.push(`${field} must be a valid email`);
      }
      if (rule.type === 'password' && !isValidPassword(value)) {
        errors.push(`${field} must be at least 8 characters`);
      }
      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`);
      }
      if (rule.type === 'recurrenceType' && !RECURRENCE_TYPES.includes(value)) {
        errors.push(`${field} must be one of ${RECURRENCE_TYPES.join(', ')}`);
      }
      if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        errors.push(`${field} must be under ${rule.maxLength} characters`);
      }
    }

    if (errors.length) {
      return next(new AppError('Validation failed', 422, errors));
    }
    next();
  };
}
