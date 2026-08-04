export function formatCurrency(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function recurrenceSummary(recurrenceType, config = {}) {
  switch (recurrenceType) {
    case 'daily':
      return config.interval > 1 ? `Every ${config.interval} days` : 'Daily';
    case 'weekly': {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const selected = (config.daysOfWeek || []).map((d) => days[d]).join(', ');
      return selected ? `Weekly on ${selected}` : 'Weekly';
    }
    case 'monthly':
      return config.dayOfMonth ? `Monthly on day ${config.dayOfMonth}` : 'Monthly';
    case 'yearly':
      return 'Yearly';
    case 'custom':
      return `Every ${config.interval || 1} ${config.unit || 'days'}`;
    default:
      return capitalize(recurrenceType);
  }
}

export function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}
