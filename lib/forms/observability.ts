import type { BuildFormDbLookupOperator } from '@skitsaas/sdk/server';
import type {
  BuildFormAccessScope,
  BuildFormArea
} from '@/lib/forms/security';
import { resolveClientIpAddress } from '@/lib/auth/break-glass';
import type { CreateSysActivityLogInput } from '@/lib/system/activity-logs';

type BuildFormActor = {
  id?: unknown;
  email?: unknown;
  role?: unknown;
} | null;

export type BuildFormPreflightRateLimitedObservation = {
  type: 'preflight.rate_limited';
  request: Request;
  formId: string;
  area: BuildFormArea;
  field: string | null;
  access: BuildFormAccessScope;
  route?: string | null;
  status: number;
  retryAfterSeconds?: number;
  currentUser: BuildFormActor;
};

export type BuildFormDbResolverMissingObservation = {
  type: 'db.resolver_missing';
  operator: BuildFormDbLookupOperator;
  target: string;
  runtime: 'server' | 'preflight';
  formId?: string | null;
  fieldName?: string | null;
  user: BuildFormActor;
};

export type BuildFormValidationObservation =
  | BuildFormPreflightRateLimitedObservation
  | BuildFormDbResolverMissingObservation;

export type BuildFormValidationObserver = (
  event: BuildFormValidationObservation
) => Promise<void> | void;

let configuredBuildFormValidationObserver: BuildFormValidationObserver | null =
  null;

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePositiveInt(value: unknown) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveActorIdentity(actor: BuildFormActor) {
  return {
    actorUserId: normalizePositiveInt(actor?.id),
    actorEmail: normalizeText(actor?.email) || null,
    actorRole: normalizeText(actor?.role) || null
  };
}

function readRequestId(request: Request) {
  const candidates = [
    request.headers.get('x-request-id'),
    request.headers.get('x-vercel-id'),
    request.headers.get('cf-ray')
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function readIpAddress(request: Request) {
  return (
    resolveClientIpAddress({
      xForwardedFor: request.headers.get('x-forwarded-for'),
      xRealIp: request.headers.get('x-real-ip')
    }) ?? null
  );
}

export function configureBuildFormValidationObservability(
  observer: BuildFormValidationObserver | null
) {
  configuredBuildFormValidationObserver = observer;
}

export function createBuildFormValidationActivityLogInput(
  event: BuildFormValidationObservation
): CreateSysActivityLogInput {
  if (event.type === 'preflight.rate_limited') {
    const actor = resolveActorIdentity(event.currentUser);
    return {
      eventType: 'build_form.preflight.rate_limited',
      eventCategory: 'forms',
      action: 'validate',
      status: 'warning',
      actorUserId: actor.actorUserId,
      actorEmail: actor.actorEmail,
      actorRole: actor.actorRole,
      entityType: 'build_form',
      entityId: event.formId,
      source: '/api/forms/validate',
      ipAddress: readIpAddress(event.request),
      requestId: readRequestId(event.request),
      message: 'BuildForm preflight request was blocked by the configured limiter.',
      metadata: {
        formId: event.formId,
        area: event.area,
        field: event.field,
        access: event.access,
        route: event.route ?? null,
        status: event.status,
        retryAfterSeconds: event.retryAfterSeconds ?? null
      }
    };
  }

  const actor = resolveActorIdentity(event.user);
  return {
    eventType: 'build_form.db_resolver.missing',
    eventCategory: 'forms',
    action: 'validate',
    status: 'warning',
    actorUserId: actor.actorUserId,
    actorEmail: actor.actorEmail,
    actorRole: actor.actorRole,
    entityType: 'build_form.db_target',
    entityId: event.target,
    source:
      event.runtime === 'preflight'
        ? 'build_form.preflight'
        : 'build_form.server',
    message: 'BuildForm DB validation target has no registered host resolver.',
    metadata: {
      formId: event.formId ?? null,
      fieldName: event.fieldName ?? null,
      operator: event.operator,
      runtime: event.runtime,
      target: event.target
    }
  };
}

export function createBuildFormSysActivityObserver(): BuildFormValidationObserver {
  return async (event) => {
    const { createSysActivityLog } = await import('@/lib/system/activity-logs');
    await createSysActivityLog(createBuildFormValidationActivityLogInput(event));
  };
}

export async function observeBuildFormValidation(
  event: BuildFormValidationObservation
) {
  if (!configuredBuildFormValidationObserver) {
    return;
  }

  try {
    await configuredBuildFormValidationObserver(event);
  } catch (error) {
    console.error('Unable to observe BuildForm validation event:', error);
  }
}
