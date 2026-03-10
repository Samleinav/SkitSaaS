/**
 * Guard policy tests for BuildForm server actions.
 *
 * These tests verify that the server action controller mechanism enforces
 * server-side auth before any handler runs. Page access and form rendering
 * are NOT sufficient authorization — every admin/dashboard mutation must go
 * through a controller wrapper (adminAction, dashboardAction, etc.) that calls
 * requireAdminUser() or requireDashboardUser() on the server.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createServerActionController } from '../../lib/actions/controller';

test('server action controller blocks handler when requireUser throws', async () => {
  let handlerCalled = false;

  const controller = createServerActionController({
    requireUser: async () => {
      throw new Error('UNAUTHORIZED');
    }
  });

  const action = controller(async () => {
    handlerCalled = true;
  });

  await assert.rejects(
    () => action(new FormData()),
    (err: unknown) => err instanceof Error && err.message === 'UNAUTHORIZED'
  );

  assert.equal(handlerCalled, false, 'handler must not run when requireUser throws');
});

test('server action controller blocks handler when requireUser redirects (NEXT_REDIRECT)', async () => {
  let handlerCalled = false;
  const redirectError = Object.assign(new Error('NEXT_REDIRECT'), {
    digest: 'NEXT_REDIRECT;replace;/admin/login;308;'
  });

  const controller = createServerActionController({
    requireUser: async () => {
      throw redirectError;
    }
  });

  const action = controller(async () => {
    handlerCalled = true;
  });

  await assert.rejects(
    () => action(new FormData()),
    (err: unknown) =>
      err instanceof Error &&
      typeof (err as { digest?: string }).digest === 'string' &&
      ((err as unknown) as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );

  assert.equal(handlerCalled, false, 'handler must not run when requireUser redirects');
});

test('server action controller runs handler only after requireUser succeeds', async () => {
  const calls: string[] = [];

  const controller = createServerActionController({
    requireUser: async () => {
      calls.push('requireUser');
      return { id: 1, role: 'admin' as const };
    }
  });

  const action = controller(async () => {
    calls.push('handler');
  });

  await action(new FormData());

  assert.deepEqual(calls, ['requireUser', 'handler']);
});
