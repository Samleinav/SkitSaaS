import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SDK_NOTIFY_EVENT,
  notify
} from '../../app/sdk/src/index';

test('SDK notify dispatches custom event on window', () => {
  const originalWindow = globalThis.window;
  const originalCustomEvent = globalThis.CustomEvent;
  const events: Event[] = [];

  class TestCustomEvent<T> extends Event {
    detail: T;

    constructor(type: string, init?: CustomEventInit<T>) {
      super(type);
      this.detail = (init?.detail ?? null) as T;
    }
  }

  globalThis.CustomEvent = TestCustomEvent as unknown as typeof CustomEvent;
  globalThis.window = {
    dispatchEvent(event: Event) {
      events.push(event);
      return true;
    }
  } as Window & typeof globalThis;

  try {
    notify.success('Saved from SDK', {
      title: 'Done',
      durationMs: 1200
    });

    assert.equal(events.length, 1);
    const event = events[0] as CustomEvent<{
      title?: string;
      message: string;
      tone?: string;
      durationMs?: number;
    }>;
    assert.equal(event.type, SDK_NOTIFY_EVENT);
    assert.equal(event.detail.title, 'Done');
    assert.equal(event.detail.message, 'Saved from SDK');
    assert.equal(event.detail.tone, 'success');
    assert.equal(event.detail.durationMs, 1200);
  } finally {
    globalThis.window = originalWindow;
    globalThis.CustomEvent = originalCustomEvent;
  }
});
