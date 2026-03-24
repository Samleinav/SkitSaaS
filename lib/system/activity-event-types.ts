export const HIGH_VALUE_SYSTEM_ACTIVITY_EVENT_TYPE_PATTERNS = [
  'auth.break_glass.password',
  'auth.password_sign_in',
  'auth.session.',
  'auth.proxy.',
  'auth.api.',
  'auth.provider_handoff.',
  'admin.users.',
  'admin.orders.',
  'admin.subscriptions.',
  'dashboard.subscriptions.',
  'build_form.',
  'module.dispatch.failed',
  'checkout.method.',
  'checkout.legacy_route.used',
  'billing.',
  'webhook.'
] as const;

export function isHighValueSystemActivityEventType(
  value: string | null | undefined
) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return HIGH_VALUE_SYSTEM_ACTIVITY_EVENT_TYPE_PATTERNS.some((pattern) =>
    pattern.endsWith('.')
      ? normalized.startsWith(pattern)
      : normalized === pattern
  );
}
