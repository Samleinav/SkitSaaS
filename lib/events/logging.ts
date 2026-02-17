import { createSysActivityLog } from '@/lib/system/activity-logs';
import type { EventHook, ModuleEventContext, RegisteredEventHandler } from './types';

export type EventLogStatus = 'info' | 'success' | 'warning' | 'failed';
export type EventLogAction = 'emit' | 'queue' | 'handler';

type EventLogInput = {
  hook: EventHook;
  context: ModuleEventContext;
  action: EventLogAction;
  status?: EventLogStatus;
  message?: string | null;
  handlerEntry?: RegisteredEventHandler | null;
  durationMs?: number | null;
  error?: unknown;
};

function formatError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return error ?? null;
}

export async function logEventActivity({
  hook,
  context,
  action,
  status = 'info',
  message = null,
  handlerEntry = null,
  durationMs = null,
  error
}: EventLogInput) {
  const metadata: Record<string, unknown> = {
    eventId: context.eventId
  };

  if (context.moduleId) {
    metadata.emitterModuleId = context.moduleId;
  }

  if (handlerEntry) {
    metadata.handlerId = handlerEntry.handler.id;
    metadata.handlerPriority = handlerEntry.handler.priority ?? 0;
    metadata.moduleId = handlerEntry.moduleId;
  }

  if (durationMs !== null) {
    metadata.durationMs = durationMs;
  }

  if (context.metadata) {
    metadata.context = context.metadata;
  }

  if (error) {
    metadata.error = formatError(error);
  }

  await createSysActivityLog({
    eventType: hook,
    eventCategory: 'event_bus',
    action,
    status,
    actorUserId: context.actorUserId ?? null,
    actorEmail: context.actorEmail ?? null,
    actorRole: context.actorRole ?? null,
    targetUserId: context.targetUserId ?? null,
    teamId: context.teamId ?? null,
    requestId: context.requestId ?? null,
    source: context.source ?? null,
    message,
    metadata
  });
}
