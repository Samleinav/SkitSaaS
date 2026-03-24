import { resolveClientIp } from '@/lib/auth/rate-limit';
import { getOrCreateRequestId } from '@/lib/observability/request-id';

type AuthAuditStatus = 'info' | 'success' | 'warning' | 'failed';

export async function createAuthAuditLog({
  eventType,
  action,
  status,
  message,
  request,
  source,
  ipAddress,
  requestId,
  actorUserId,
  actorEmail,
  actorRole,
  metadata
}: {
  eventType: string;
  action: string;
  status: AuthAuditStatus;
  message: string;
  request?: Request;
  source?: string | null;
  ipAddress?: string | null;
  requestId?: string | null;
  actorUserId?: number | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    if (!process.env.POSTGRES_URL?.trim() && !process.env.ADMIN_POSTGRES_URL?.trim()) {
      return;
    }

    const { createSysActivityLog } = await import('@/lib/system/activity-logs');
    await createSysActivityLog({
      eventType,
      eventCategory: 'auth',
      action,
      status,
      actorUserId: actorUserId ?? null,
      actorEmail: actorEmail ?? null,
      actorRole: actorRole ?? null,
      source: source ?? readRequestPath(request),
      ipAddress: ipAddress ?? resolveRequestIp(request),
      requestId: requestId ?? (request ? getOrCreateRequestId(request) : null),
      message,
      metadata
    });
  } catch {
    // Auth audit logging is best-effort until the dedicated governance sink lands.
  }
}

function readRequestPath(request?: Request) {
  if (!request) {
    return null;
  }

  try {
    return new URL(request.url).pathname;
  } catch {
    return null;
  }
}

function resolveRequestIp(request?: Request) {
  if (!request) {
    return null;
  }

  return resolveClientIp(request);
}
