import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFormField,
  defineBuildForm
} from '../../app/sdk/src/forms';
import {
  buildFormRule,
  dbRef,
  fieldRef,
  withBuildFormValidation
} from '../../app/sdk/src/form-validation';
import { configureBuildFormDbValidation } from '@skitsaas/sdk/server';
import {
  configureBuildFormValidationObservability,
  type BuildFormValidationObservation
} from '../../lib/forms/observability';
import { handleBuildFormPreflightRequest } from '../../lib/forms/preflight';

const registeredAdminPreflightForm = withBuildFormValidation(
  defineBuildForm({
    id: 'admin-create-user-form',
    fields: [
      buildFormField.email({
        name: 'email',
        label: 'Email'
      })
    ]
  }),
  {
    preflight: {
      enabled: true,
      validateOn: ['blur']
    },
    fields: {
      email: [
        buildFormRule.required(),
        buildFormRule.email(),
        buildFormRule.unique(dbRef('core.users.email'))
      ]
    }
  }
);

const registeredAdminEditPreflightForm = withBuildFormValidation(
  defineBuildForm({
    id: 'admin-edit-user-profile-form',
    fields: [
      buildFormField.hidden({
        name: 'userId'
      }),
      buildFormField.email({
        name: 'email',
        label: 'Email'
      })
    ]
  }),
  {
    preflight: {
      enabled: true,
      validateOn: ['blur']
    },
    fields: {
      userId: [buildFormRule.required()],
      email: [
        buildFormRule.required(),
        buildFormRule.email(),
        buildFormRule.unique(dbRef('core.users.email'), {
          ignore: fieldRef('userId')
        })
      ]
    }
  }
);

test('build form preflight rejects invalid origin and unauthorized admin access', async () => {
  const invalidOriginResponse = await handleBuildFormPreflightRequest(
    new Request('https://example.test/api/forms/validate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://evil.test'
      },
      body: JSON.stringify({
        formId: 'admin-create-user-form',
        area: 'admin',
        field: 'email',
        values: {
          email: 'user@example.com'
        }
      })
    }),
    {
      resolveForm: async () => ({
        formId: 'admin-create-user-form',
        area: 'admin',
        access: 'admin',
        resolveDefinition: () => registeredAdminPreflightForm
      }),
      getCurrentUser: async () => ({
        id: 1,
        role: 'admin'
      })
    }
  );

  assert.equal(invalidOriginResponse.status, 403);

  const unauthorizedResponse = await handleBuildFormPreflightRequest(
    new Request('https://example.test/api/forms/validate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://example.test'
      },
      body: JSON.stringify({
        formId: 'admin-create-user-form',
        area: 'admin',
        field: 'email',
        values: {
          email: 'user@example.com'
        }
      })
    }),
    {
      resolveForm: async () => ({
        formId: 'admin-create-user-form',
        area: 'admin',
        access: 'admin',
        resolveDefinition: () => registeredAdminPreflightForm
      }),
      getCurrentUser: async () => null
    }
  );

  assert.equal(unauthorizedResponse.status, 401);
});

test('build form preflight returns field errors for db-aware rules and skips lookup on local invalid data', async () => {
  const lookups: string[] = [];

  configureBuildFormDbValidation({
    async lookup(request) {
      lookups.push(String(request.value ?? ''));
      return {
        exists: request.value === 'taken@example.com'
      };
    }
  });

  const invalidLocalResponse = await handleBuildFormPreflightRequest(
    new Request('https://example.test/api/forms/validate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://example.test'
      },
      body: JSON.stringify({
        formId: 'admin-create-user-form',
        area: 'admin',
        field: 'email',
        values: {
          email: 'invalid'
        }
      })
    }),
    {
      resolveForm: async () => ({
        formId: 'admin-create-user-form',
        area: 'admin',
        access: 'admin',
        resolveDefinition: () => registeredAdminPreflightForm
      }),
      getCurrentUser: async () => ({
        id: 1,
        role: 'admin'
      })
    }
  );

  const invalidLocalResult = await invalidLocalResponse.json();
  assert.equal(invalidLocalResponse.status, 200);
  assert.deepEqual(invalidLocalResult.fieldErrors.email, [
    'Email must be a valid email address.'
  ]);
  assert.deepEqual(lookups, []);

  const takenEmailResponse = await handleBuildFormPreflightRequest(
    new Request('https://example.test/api/forms/validate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://example.test'
      },
      body: JSON.stringify({
        formId: 'admin-create-user-form',
        area: 'admin',
        field: 'email',
        values: {
          email: 'taken@example.com'
        }
      })
    }),
    {
      resolveForm: async () => ({
        formId: 'admin-create-user-form',
        area: 'admin',
        access: 'admin',
        resolveDefinition: () => registeredAdminPreflightForm
      }),
      getCurrentUser: async () => ({
        id: 1,
        role: 'admin'
      })
    }
  );

  const takenEmailResult = await takenEmailResponse.json();
  assert.equal(takenEmailResponse.status, 200);
  assert.equal(takenEmailResult.valid, false);
  assert.deepEqual(takenEmailResult.fieldErrors.email, [
    'Email must be unique.'
  ]);
  assert.deepEqual(lookups, ['taken@example.com']);
});

test('build form preflight passes ignore current record values to db-aware unique rules', async () => {
  const lookups: Array<Record<string, unknown>> = [];

  configureBuildFormDbValidation({
    async lookup(request) {
      lookups.push({
        operator: request.operator,
        value: request.value,
        ignore: request.ignore
      });

      return {
        exists: request.value === 'taken@example.com' && request.ignore !== '7'
      };
    }
  });

  const response = await handleBuildFormPreflightRequest(
    new Request('https://example.test/api/forms/validate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://example.test'
      },
      body: JSON.stringify({
        formId: 'admin-edit-user-profile-form',
        area: 'admin',
        field: 'email',
        values: {
          userId: '7',
          email: 'taken@example.com'
        }
      })
    }),
    {
      resolveForm: async () => ({
        formId: 'admin-edit-user-profile-form',
        area: 'admin',
        access: 'admin',
        resolveDefinition: () => registeredAdminEditPreflightForm
      }),
      getCurrentUser: async () => ({
        id: 1,
        role: 'admin'
      })
    }
  );

  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.valid, true);
  assert.deepEqual(result.fieldErrors, {});
  assert.deepEqual(lookups, [
    {
      operator: 'unique',
      value: 'taken@example.com',
      ignore: '7'
    }
  ]);
});

test('build form preflight supports host-owned rate limiting before validation runs', async () => {
  let resolvedDefinition = false;

  const response = await handleBuildFormPreflightRequest(
    new Request('https://example.test/api/forms/validate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://example.test'
      },
      body: JSON.stringify({
        formId: 'admin-create-user-form',
        area: 'admin',
        field: 'email',
        values: {
          email: 'invalid'
        }
      })
    }),
    {
      resolveForm: async () => ({
        formId: 'admin-create-user-form',
        area: 'admin',
        access: 'admin',
        resolveDefinition: () => {
          resolvedDefinition = true;
          return registeredAdminPreflightForm;
        }
      }),
      getCurrentUser: async () => ({
        id: 1,
        role: 'admin'
      }),
      rateLimit: async () => ({
        allowed: false,
        retryAfterSeconds: 30
      })
    }
  );

  const result = await response.json();
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '30');
  assert.deepEqual(result, {
    error: 'Too many requests.'
  });
  assert.equal(resolvedDefinition, false);
});

test('build form preflight emits an observability event when rate limiting blocks validation', async () => {
  const observations: BuildFormValidationObservation[] = [];

  configureBuildFormValidationObservability(async (event) => {
    observations.push(event);
  });

  try {
    const response = await handleBuildFormPreflightRequest(
      new Request('https://example.test/api/forms/validate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://example.test',
          'x-request-id': 'req-build-form-preflight-1',
          'x-forwarded-for': '203.0.113.8'
        },
        body: JSON.stringify({
          formId: 'admin-create-user-form',
          area: 'admin',
          field: 'email',
          values: {
            email: 'blocked@example.com'
          }
        })
      }),
      {
        resolveForm: async () => ({
          formId: 'admin-create-user-form',
          area: 'admin',
          access: 'admin',
          route: '/admin/users',
          resolveDefinition: () => registeredAdminPreflightForm
        }),
        getCurrentUser: async () => ({
          id: 7,
          email: 'admin@example.com',
          role: 'admin'
        }),
        rateLimit: async () => ({
          allowed: false,
          status: 429,
          retryAfterSeconds: 45
        })
      }
    );

    assert.equal(response.status, 429);
    assert.equal(observations.length, 1);
    const observed = observations[0];
    assert.ok(observed);
    assert.equal(observed.type, 'preflight.rate_limited');
    assert.deepEqual(observed, {
      type: 'preflight.rate_limited',
      request: observed.request,
      formId: 'admin-create-user-form',
      area: 'admin',
      field: 'email',
      access: 'admin',
      route: '/admin/users',
      status: 429,
      retryAfterSeconds: 45,
      currentUser: {
        id: 7,
        email: 'admin@example.com',
        role: 'admin'
      }
    });
  } finally {
    configureBuildFormValidationObservability(null);
  }
});
