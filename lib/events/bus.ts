import { dequeueEvent, enqueueEvent } from './queue';
import { getEventHandlersForHook } from './registry';
import { logEventActivity } from './logging';
import type {
  EventDispatchResult,
  EventEmitContext,
  EventEnvelope,
  EventPayload,
  EventHook,
  ModuleEventContext,
  RegisteredEventHandler
} from './types';

export type EventBusDeps = {
  resolveHandlers?: (hook: string) => Promise<RegisteredEventHandler[]>;
  enqueueEvent?: (envelope: EventEnvelope) => Promise<boolean>;
  dequeueEvent?: () => Promise<EventEnvelope | null>;
  logEvent?: (input: Parameters<typeof logEventActivity>[0]) => Promise<void>;
  now?: () => number;
};

function createEventId() {
  const candidate = globalThis.crypto?.randomUUID?.();
  if (candidate) {
    return candidate;
  }

  return `evt_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function buildContext(
  hook: EventHook,
  context: EventEmitContext | undefined
): ModuleEventContext {
  return {
    hook,
    eventId: context?.eventId || createEventId(),
    source: context?.source ?? null,
    actorUserId: context?.actorUserId ?? null,
    actorEmail: context?.actorEmail ?? null,
    actorRole: context?.actorRole ?? null,
    teamId: context?.teamId ?? null,
    targetUserId: context?.targetUserId ?? null,
    requestId: context?.requestId ?? null,
    moduleId: context?.moduleId ?? null,
    metadata: context?.metadata ?? null
  };
}

function stripContext(context: ModuleEventContext): EventEmitContext {
  const { hook: _hook, eventId, ...rest } = context;
  return { ...rest, eventId };
}

export function createEventBus({
  resolveHandlers = getEventHandlersForHook,
  enqueueEvent: enqueue = enqueueEvent,
  dequeueEvent: dequeue = dequeueEvent,
  logEvent = logEventActivity,
  now = () => Date.now()
}: EventBusDeps = {}) {
  async function emitEvent<TPayload extends EventPayload>(
    hook: EventHook,
    payload: TPayload,
    context?: EventEmitContext
  ): Promise<EventDispatchResult> {
    const resolvedContext = buildContext(hook, context);
    let handlers: RegisteredEventHandler[] = [];

    try {
      handlers = await resolveHandlers(hook);
    } catch (error) {
      console.error('Unable to resolve event handlers:', error);
      handlers = [];
    }

    try {
      await logEvent({
        hook,
        context: resolvedContext,
        action: 'emit',
        status: 'info',
        message: 'Event emitted.'
      });
    } catch (error) {
      console.error('Unable to log event emit:', error);
    }

    for (const entry of handlers) {
      const start = now();
      try {
        await entry.handler.run(payload, resolvedContext);
        const durationMs = now() - start;

        try {
          await logEvent({
            hook,
            context: resolvedContext,
            action: 'handler',
            status: 'success',
            message: 'Event handler completed.',
            handlerEntry: entry,
            durationMs
          });
        } catch (error) {
          console.error('Unable to log event handler success:', error);
        }
      } catch (error) {
        const durationMs = now() - start;

        try {
          await logEvent({
            hook,
            context: resolvedContext,
            action: 'handler',
            status: 'failed',
            message: 'Event handler failed.',
            handlerEntry: entry,
            durationMs,
            error
          });
        } catch (logError) {
          console.error('Unable to log event handler failure:', logError);
        }
      }
    }

    return {
      eventId: resolvedContext.eventId,
      handlerCount: handlers.length,
      mode: 'inline'
    };
  }

  async function emitEventAsync<TPayload extends EventPayload>(
    hook: EventHook,
    payload: TPayload,
    context?: EventEmitContext
  ): Promise<EventDispatchResult> {
    const resolvedContext = buildContext(hook, context);
    const envelope: EventEnvelope = {
      eventId: resolvedContext.eventId,
      hook,
      payload,
      context: stripContext(resolvedContext),
      createdAt: new Date().toISOString()
    };

    let queued = false;

    try {
      queued = await enqueue(envelope);
    } catch (error) {
      console.error('Unable to queue event:', error);
      queued = false;
    }

    if (queued) {
      try {
        await logEvent({
          hook,
          context: resolvedContext,
          action: 'queue',
          status: 'info',
          message: 'Event queued for async dispatch.'
        });
      } catch (error) {
        console.error('Unable to log queued event:', error);
      }

      return {
        eventId: resolvedContext.eventId,
        handlerCount: 0,
        mode: 'queued'
      };
    }

    return emitEvent(hook, payload, resolvedContext);
  }

  async function processEventQueue({
    limit = 50
  }: { limit?: number } = {}): Promise<{ processed: number }> {
    let processed = 0;

    for (let i = 0; i < limit; i += 1) {
      const envelope = await dequeue();
      if (!envelope) {
        break;
      }

      try {
        await emitEvent(
          envelope.hook,
          envelope.payload,
          envelope.context
        );
      } catch (error) {
        console.error('Unable to process queued event:', error);
      }
      processed += 1;
    }

    return { processed };
  }

  return {
    emitEvent,
    emitEventAsync,
    processEventQueue
  };
}

export const { emitEvent, emitEventAsync, processEventQueue } =
  createEventBus();
