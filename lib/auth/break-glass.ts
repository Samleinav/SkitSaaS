type BreakGlassBlockReason = 'passkey_required' | 'ip_not_allowed' | 'locked_out';

export type BreakGlassPasswordDecision = {
  isBreakGlassUser: boolean;
  allowed: boolean;
  reason: 'allowed' | 'not_break_glass_user' | BreakGlassBlockReason;
  retryAfterSeconds: number | null;
  policy: BreakGlassAuthPolicy;
};

export type BreakGlassFailureState = {
  isBreakGlassUser: boolean;
  attempts: number;
  maxAttempts: number;
  isLocked: boolean;
  retryAfterSeconds: number | null;
  lockoutUntilIso: string | null;
};

export type BreakGlassAuthPolicy = {
  breakGlassEmails: Set<string>;
  requirePasskey: boolean;
  allowPasswordBypass: boolean;
  allowedIps: Set<string>;
  maxAttempts: number;
  windowSeconds: number;
  lockoutSeconds: number;
};

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_LOCKOUT_SECONDS = 30 * 60;

type BreakGlassAttemptState = {
  attempts: number;
  windowStartedAtMs: number;
  lockedUntilMs: number | null;
};

const breakGlassAttemptState = new Map<string, BreakGlassAttemptState>();

function parsePositiveInt(
  value: string | undefined,
  fallbackValue: number,
  minimumValue: number
) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed < minimumValue) {
    return fallbackValue;
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallbackValue: boolean) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return fallbackValue;
  }

  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true;
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false;
  }

  return fallbackValue;
}

function parseCsvSet(value: string | undefined) {
  if (!value) {
    return new Set<string>();
  }

  return new Set(
    value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
  );
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeIpAddress(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  let normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.toLowerCase().startsWith('for=')) {
    normalized = normalized.slice(4).trim();
  }

  normalized = normalized.replace(/^"|"$/g, '');
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('[') && normalized.includes(']')) {
    const closingIndex = normalized.indexOf(']');
    if (closingIndex > 1) {
      return normalized.slice(1, closingIndex);
    }
  }

  const colonCount = (normalized.match(/:/g) ?? []).length;
  if (colonCount === 1 && normalized.includes('.')) {
    const [host] = normalized.split(':');
    const trimmedHost = host?.trim();
    if (trimmedHost) {
      return trimmedHost;
    }
  }

  return normalized;
}

export function resolveClientIpAddress({
  xForwardedFor,
  xRealIp
}: {
  xForwardedFor?: string | null;
  xRealIp?: string | null;
}) {
  const forwardedCandidate = xForwardedFor
    ?.split(',')
    .map((value) => value.trim())
    .find((value) => value.length > 0);
  const forwardedIp = normalizeIpAddress(forwardedCandidate ?? null);
  if (forwardedIp) {
    return forwardedIp;
  }

  return normalizeIpAddress(xRealIp ?? null);
}

export function readBreakGlassAuthPolicy(): BreakGlassAuthPolicy {
  const breakGlassEmails = new Set(
    [...parseCsvSet(process.env.AUTH_BREAK_GLASS_EMAILS)].map(normalizeEmail)
  );
  const requirePasskey = parseBoolean(
    process.env.AUTH_BREAK_GLASS_REQUIRE_PASSKEY,
    true
  );
  const allowPasswordBypass = parseBoolean(
    process.env.AUTH_BREAK_GLASS_ALLOW_PASSWORD_BYPASS,
    false
  );
  const allowedIps = new Set(
    [...parseCsvSet(process.env.AUTH_BREAK_GLASS_ALLOWED_IPS)]
      .map((value) => normalizeIpAddress(value))
      .filter((value): value is string => Boolean(value))
  );

  return {
    breakGlassEmails,
    requirePasskey,
    allowPasswordBypass,
    allowedIps,
    maxAttempts: parsePositiveInt(
      process.env.AUTH_BREAK_GLASS_MAX_ATTEMPTS,
      DEFAULT_MAX_ATTEMPTS,
      1
    ),
    windowSeconds: parsePositiveInt(
      process.env.AUTH_BREAK_GLASS_WINDOW_SECONDS,
      DEFAULT_WINDOW_SECONDS,
      30
    ),
    lockoutSeconds: parsePositiveInt(
      process.env.AUTH_BREAK_GLASS_LOCKOUT_SECONDS,
      DEFAULT_LOCKOUT_SECONDS,
      30
    )
  };
}

function buildBreakGlassAttemptKey(email: string, ipAddress: string | null) {
  return `${email}|${ipAddress ?? 'unknown'}`;
}

function getActiveAttemptState({
  key,
  nowMs,
  policy
}: {
  key: string;
  nowMs: number;
  policy: BreakGlassAuthPolicy;
}) {
  const currentState = breakGlassAttemptState.get(key);
  if (!currentState) {
    return null;
  }

  if (currentState.lockedUntilMs !== null) {
    if (currentState.lockedUntilMs > nowMs) {
      return currentState;
    }

    breakGlassAttemptState.delete(key);
    return null;
  }

  const windowMs = policy.windowSeconds * 1000;
  if (nowMs - currentState.windowStartedAtMs > windowMs) {
    breakGlassAttemptState.delete(key);
    return null;
  }

  return currentState;
}

function evaluateLockoutState({
  key,
  nowMs,
  policy
}: {
  key: string;
  nowMs: number;
  policy: BreakGlassAuthPolicy;
}) {
  const state = getActiveAttemptState({ key, nowMs, policy });
  if (!state || state.lockedUntilMs === null || state.lockedUntilMs <= nowMs) {
    return {
      isLocked: false,
      retryAfterSeconds: null
    };
  }

  return {
    isLocked: true,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((state.lockedUntilMs - nowMs) / 1000)
    )
  };
}

export function evaluateBreakGlassPasswordPolicy({
  email,
  ipAddress,
  nowMs = Date.now()
}: {
  email: string;
  ipAddress?: string | null;
  nowMs?: number;
}): BreakGlassPasswordDecision {
  const policy = readBreakGlassAuthPolicy();
  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = normalizeIpAddress(ipAddress ?? null);

  if (!policy.breakGlassEmails.has(normalizedEmail)) {
    return {
      isBreakGlassUser: false,
      allowed: true,
      reason: 'not_break_glass_user',
      retryAfterSeconds: null,
      policy
    };
  }

  if (
    policy.allowedIps.size > 0 &&
    (!normalizedIp || !policy.allowedIps.has(normalizedIp))
  ) {
    return {
      isBreakGlassUser: true,
      allowed: false,
      reason: 'ip_not_allowed',
      retryAfterSeconds: null,
      policy
    };
  }

  const key = buildBreakGlassAttemptKey(normalizedEmail, normalizedIp);
  const lockoutState = evaluateLockoutState({ key, nowMs, policy });
  if (lockoutState.isLocked) {
    return {
      isBreakGlassUser: true,
      allowed: false,
      reason: 'locked_out',
      retryAfterSeconds: lockoutState.retryAfterSeconds,
      policy
    };
  }

  if (policy.requirePasskey && !policy.allowPasswordBypass) {
    return {
      isBreakGlassUser: true,
      allowed: false,
      reason: 'passkey_required',
      retryAfterSeconds: null,
      policy
    };
  }

  return {
    isBreakGlassUser: true,
    allowed: true,
    reason: 'allowed',
    retryAfterSeconds: null,
    policy
  };
}

export function registerBreakGlassPasswordFailure({
  email,
  ipAddress,
  nowMs = Date.now()
}: {
  email: string;
  ipAddress?: string | null;
  nowMs?: number;
}): BreakGlassFailureState | null {
  const policy = readBreakGlassAuthPolicy();
  const normalizedEmail = normalizeEmail(email);
  if (!policy.breakGlassEmails.has(normalizedEmail)) {
    return null;
  }

  const normalizedIp = normalizeIpAddress(ipAddress ?? null);
  const key = buildBreakGlassAttemptKey(normalizedEmail, normalizedIp);
  const existingState = getActiveAttemptState({ key, nowMs, policy });

  const nextState: BreakGlassAttemptState = existingState
    ? {
        attempts: existingState.attempts + 1,
        windowStartedAtMs: existingState.windowStartedAtMs,
        lockedUntilMs: existingState.lockedUntilMs
      }
    : {
        attempts: 1,
        windowStartedAtMs: nowMs,
        lockedUntilMs: null
      };

  if (nextState.attempts >= policy.maxAttempts) {
    nextState.lockedUntilMs = nowMs + policy.lockoutSeconds * 1000;
  }

  breakGlassAttemptState.set(key, nextState);

  const retryAfterSeconds =
    nextState.lockedUntilMs !== null
      ? Math.max(1, Math.ceil((nextState.lockedUntilMs - nowMs) / 1000))
      : null;

  return {
    isBreakGlassUser: true,
    attempts: nextState.attempts,
    maxAttempts: policy.maxAttempts,
    isLocked: nextState.lockedUntilMs !== null,
    retryAfterSeconds,
    lockoutUntilIso:
      nextState.lockedUntilMs !== null
        ? new Date(nextState.lockedUntilMs).toISOString()
        : null
  };
}

export function clearBreakGlassPasswordFailureState({
  email,
  ipAddress
}: {
  email: string;
  ipAddress?: string | null;
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = normalizeIpAddress(ipAddress ?? null);
  const key = buildBreakGlassAttemptKey(normalizedEmail, normalizedIp);
  breakGlassAttemptState.delete(key);
}

export function resetBreakGlassPasswordFailureStateForTests() {
  breakGlassAttemptState.clear();
}
