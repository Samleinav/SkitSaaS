export function formatDate(value: Date | null, locale: string = 'en-US') {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(value);
}

export function formatDateTime(value: Date | null, locale: string = 'en-US') {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value);
}

export function normalizeSubscriptionStatus(status: string | null) {
  if (!status) {
    return 'free';
  }

  const normalized = status.toLowerCase();
  if (
    normalized === 'active' ||
    normalized === 'trialing' ||
    normalized === 'unpaid' ||
    normalized === 'canceled' ||
    normalized === 'free'
  ) {
    return normalized;
  }

  return 'free';
}
