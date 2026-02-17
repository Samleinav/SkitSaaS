import type { EventHook } from './catalog.js';
export type { EventHook } from './catalog.js';
export type EventPayload = Record<string, unknown>;
export type ModuleEventContext = {
    hook: EventHook;
    eventId: string;
    source?: string | null;
    actorUserId?: number | null;
    actorEmail?: string | null;
    actorRole?: string | null;
    teamId?: number | null;
    targetUserId?: number | null;
    requestId?: string | null;
    moduleId?: string | null;
    metadata?: Record<string, unknown> | null;
};
export type EventEmitContext = Omit<ModuleEventContext, 'hook' | 'eventId'> & {
    eventId?: string;
};
export type ModuleEventHandler = {
    id: string;
    hook: EventHook;
    priority?: number;
    run: (payload: EventPayload, context: ModuleEventContext) => Promise<void> | void;
};
export type RegisteredEventHandler = {
    moduleId: string | null;
    handler: ModuleEventHandler;
};
export type EventEnvelope = {
    eventId: string;
    hook: EventHook;
    payload: EventPayload;
    context: EventEmitContext;
    createdAt: string;
};
export type EventDispatchResult = {
    eventId: string;
    handlerCount: number;
    mode: 'inline' | 'queued';
};
