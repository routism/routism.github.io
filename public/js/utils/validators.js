const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

export function isValidPassword(value) {
  return String(value || '').length >= 8;
}

export function isNonEmpty(value) {
  return String(value || '').trim().length > 0;
}

/**
 * Run a set of { field: [validatorFn, message][] } rules against form values.
 * Returns a map of field -> first error message, empty object if valid.
 */
export function runValidators(values, rules) {
  const errors = {};
  for (const [field, checks] of Object.entries(rules)) {
    for (const [fn, message] of checks) {
      if (!fn(values[field])) {
        errors[field] = message;
        break;
      }
    }
  }
  return errors;
}
