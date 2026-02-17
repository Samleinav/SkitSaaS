import type { ModuleEventHandler, RegisteredEventHandler } from './types';

const CORE_EVENT_HANDLERS: RegisteredEventHandler[] = [];

export function registerCoreEventHandler(
  handler: ModuleEventHandler,
  moduleId = 'core'
) {
  CORE_EVENT_HANDLERS.push({ moduleId, handler });
}

export function getCoreEventHandlers() {
  return CORE_EVENT_HANDLERS;
}

function normalizePriority(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return value;
}

function sortHandlers(entries: RegisteredEventHandler[]) {
  return entries.sort((a, b) => {
    const priorityA = normalizePriority(a.handler.priority);
    const priorityB = normalizePriority(b.handler.priority);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return a.handler.id.localeCompare(b.handler.id);
  });
}

export function buildEventHandlerIndex(
  handlers: RegisteredEventHandler[]
): Map<string, RegisteredEventHandler[]> {
  const index = new Map<string, RegisteredEventHandler[]>();

  for (const entry of handlers) {
    const hook = entry.handler.hook;
    if (!hook) {
      continue;
    }

    const list = index.get(hook);
    if (list) {
      list.push(entry);
    } else {
      index.set(hook, [entry]);
    }
  }

  for (const list of index.values()) {
    sortHandlers(list);
  }

  return index;
}

async function getEnabledModuleEventHandlers(): Promise<RegisteredEventHandler[]> {
  const { getEnabledModuleManifests } = await import('../modules/runtime');
  const manifests = await getEnabledModuleManifests();

  return manifests.flatMap((manifest) =>
    (manifest.eventHandlers ?? []).map((handler) => ({
      moduleId: manifest.moduleId,
      handler
    }))
  );
}

export async function getRegisteredEventHandlers() {
  const moduleHandlers = await getEnabledModuleEventHandlers();
  return [...CORE_EVENT_HANDLERS, ...moduleHandlers];
}

export async function getEventHandlersForHook(hook: string) {
  const handlers = await getRegisteredEventHandlers();
  const index = buildEventHandlerIndex(handlers);
  return index.get(hook) ?? [];
}
