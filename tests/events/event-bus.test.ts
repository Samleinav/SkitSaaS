import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEventHandlerIndex } from '../../lib/events/registry';
import { createEventBus } from '../../lib/events/bus';
import type { RegisteredEventHandler } from '../../lib/events/types';

test('buildEventHandlerIndex groups and sorts handlers by priority', () => {
  const handlers: RegisteredEventHandler[] = [
    {
      moduleId: 'mod.beta',
      handler: {
        id: 'b',
        hook: 'hook.alpha',
        priority: 2,
        run: () => undefined
      }
    },
    {
      moduleId: 'mod.alpha',
      handler: {
        id: 'a',
        hook: 'hook.alpha',
        priority: 1,
        run: () => undefined
      }
    },
    {
      moduleId: 'mod.delta',
      handler: {
        id: 'd',
        hook: 'hook.alpha',
        priority: 1,
        run: () => undefined
      }
    },
    {
      moduleId: 'mod.gamma',
      handler: {
        id: 'c',
        hook: 'hook.beta',
        run: () => undefined
      }
    }
  ];

  const index = buildEventHandlerIndex(handlers);
  const alpha = index.get('hook.alpha') ?? [];

  assert.deepEqual(
    alpha.map((entry) => entry.handler.id),
    ['a', 'd', 'b']
  );
});

test('emitEvent executes handlers in order and continues after errors', async () => {
  const calls: string[] = [];
  const logs: string[] = [];

  const bus = createEventBus({
    resolveHandlers: async () => [
      {
        moduleId: 'mod.alpha',
        handler: {
          id: 'a',
          hook: 'hook.alpha',
          run: () => {
            calls.push('a');
          }
        }
      },
      {
        moduleId: 'mod.beta',
        handler: {
          id: 'b',
          hook: 'hook.alpha',
          run: () => {
            calls.push('b');
            throw new Error('boom');
          }
        }
      },
      {
        moduleId: 'mod.gamma',
        handler: {
          id: 'c',
          hook: 'hook.alpha',
          run: () => {
            calls.push('c');
          }
        }
      }
    ],
    logEvent: async (input) => {
      if (input.action === 'handler') {
        logs.push(input.status ?? 'info');
      }
    }
  });

  await bus.emitEvent('hook.alpha', { ok: true });

  assert.deepEqual(calls, ['a', 'b', 'c']);
  assert.ok(logs.includes('failed'));
  assert.ok(logs.includes('success'));
});

test('emitEventAsync falls back to inline when enqueue fails', async () => {
  const calls: string[] = [];

  const bus = createEventBus({
    resolveHandlers: async () => [
      {
        moduleId: 'mod.alpha',
        handler: {
          id: 'a',
          hook: 'hook.alpha',
          run: () => {
            calls.push('a');
          }
        }
      }
    ],
    enqueueEvent: async () => false,
    logEvent: async () => undefined
  });

  const result = await bus.emitEventAsync('hook.alpha', { ok: true });

  assert.equal(result.mode, 'inline');
  assert.deepEqual(calls, ['a']);
});

test('emitEventAsync queues event when enqueue succeeds', async () => {
  const calls: string[] = [];

  const bus = createEventBus({
    resolveHandlers: async () => [
      {
        moduleId: 'mod.alpha',
        handler: {
          id: 'a',
          hook: 'hook.alpha',
          run: () => {
            calls.push('a');
          }
        }
      }
    ],
    enqueueEvent: async () => true,
    logEvent: async () => undefined
  });

  const result = await bus.emitEventAsync('hook.alpha', { ok: true });

  assert.equal(result.mode, 'queued');
  assert.deepEqual(calls, []);
});
