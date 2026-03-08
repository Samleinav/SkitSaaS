import assert from 'node:assert/strict';
import test from 'node:test';
import {
  configureBuildFormDbValidation,
  validateBuildFormOnServer
} from '../../app/sdk/src/server';
import { buildFormField, defineBuildForm } from '../../app/sdk/src/forms';
import {
  buildFormRule,
  dbRef,
  fieldRef,
  withBuildFormValidation
} from '../../app/sdk/src/form-validation';
import { createAdminEditUserProfileBuildFormBase } from '../../app/(dashboard)/admin/users/forms';

test('validateBuildFormOnServer enforces db-aware unique and exists rules', async () => {
  const dbLookups: Array<Record<string, unknown>> = [];

  configureBuildFormDbValidation({
    async lookup(request) {
      dbLookups.push({
        operator: request.operator,
        target: request.target.target,
        value: request.value,
        ignore: request.ignore
      });

      if (
        request.operator === 'unique' &&
        request.target.target === 'core.users.email'
      ) {
        return {
          exists: request.value === 'taken@example.com' && request.ignore !== '7'
        };
      }

      if (
        request.operator === 'exists' &&
        request.target.target === 'core.subscription_templates.user'
      ) {
        return {
          exists: request.value === '12'
        };
      }

      return null;
    }
  });

  const form = withBuildFormValidation(
    defineBuildForm({
      fields: [
        buildFormField.hidden({
          name: 'userId'
        }),
        buildFormField.email({
          name: 'email',
          label: 'Email'
        }),
        buildFormField.select({
          name: 'subscriptionTemplateId',
          label: 'Subscription',
          options: [
            { value: '', label: 'None' },
            { value: '12', label: 'Starter' }
          ]
        })
      ]
    }),
    {
      fields: {
        email: [
          buildFormRule.required(),
          buildFormRule.email(),
          buildFormRule.unique(dbRef('core.users.email'), {
            ignore: fieldRef('userId')
          })
        ],
        subscriptionTemplateId: [
          buildFormRule.exists(dbRef('core.subscription_templates.user'))
        ]
      }
    }
  );

  const invalidFormData = new FormData();
  invalidFormData.set('userId', '5');
  invalidFormData.set('email', 'taken@example.com');
  invalidFormData.set('subscriptionTemplateId', '99');

  const invalidResult = await validateBuildFormOnServer({
    definition: form,
    formData: invalidFormData,
    user: {
      id: 1
    }
  });

  assert.equal(invalidResult.valid, false);
  assert.deepEqual(Object.keys(invalidResult.fieldErrors).sort(), [
    'email',
    'subscriptionTemplateId'
  ]);
  assert.equal(dbLookups.length, 2);
  assert.deepEqual(dbLookups[0], {
    operator: 'unique',
    target: 'core.users.email',
    value: 'taken@example.com',
    ignore: '5'
  });

  const ignoredFormData = new FormData();
  ignoredFormData.set('userId', '7');
  ignoredFormData.set('email', 'taken@example.com');
  ignoredFormData.set('subscriptionTemplateId', '12');

  const ignoredResult = await validateBuildFormOnServer({
    definition: form,
    formData: ignoredFormData,
    user: {
      id: 1
    }
  });

  assert.equal(ignoredResult.valid, true);
  assert.deepEqual(ignoredResult.fieldErrors, {});
});

test('validateBuildFormOnServer fails closed when db resolver is unavailable', async () => {
  configureBuildFormDbValidation({
    async lookup() {
      return null;
    }
  });

  const form = withBuildFormValidation(
    defineBuildForm({
      fields: [
        buildFormField.email({
          name: 'email',
          label: 'Email'
        })
      ]
    }),
    {
      fields: {
        email: [buildFormRule.unique(dbRef('missing.target'))]
      }
    }
  );

  const formData = new FormData();
  formData.set('email', 'user@example.com');

  const result = await validateBuildFormOnServer({
    definition: form,
    formData,
    user: {
      id: 1
    }
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.fieldErrors.email, ['Validation service is unavailable.']);
});

test('admin edit user profile form ignores the current record for unique email checks', async () => {
  const dbLookups: Array<Record<string, unknown>> = [];

  configureBuildFormDbValidation({
    async lookup(request) {
      dbLookups.push({
        operator: request.operator,
        target: request.target.target,
        value: request.value,
        ignore: request.ignore
      });

      if (
        request.operator === 'unique' &&
        request.target.target === 'core.users.email'
      ) {
        return {
          exists: request.value === 'taken@example.com' && request.ignore !== '7'
        };
      }

      if (
        request.operator === 'exists' &&
        request.target.target === 'core.subscription_templates.user'
      ) {
        return {
          exists: request.value === '12'
        };
      }

      return null;
    }
  });

  const form = createAdminEditUserProfileBuildFormBase();
  const formData = new FormData();
  formData.set('userId', '7');
  formData.set('name', 'Test User');
  formData.set('email', 'taken@example.com');
  formData.set('role', 'admin');
  formData.set('subscriptionTemplateId', '12');

  const result = await validateBuildFormOnServer({
    definition: form,
    formData,
    user: {
      id: 1
    }
  });

  assert.equal(result.valid, true);
  assert.deepEqual(dbLookups, [
    {
      operator: 'unique',
      target: 'core.users.email',
      value: 'taken@example.com',
      ignore: '7'
    },
    {
      operator: 'exists',
      target: 'core.subscription_templates.user',
      value: '12',
      ignore: undefined
    }
  ]);
});

test('validateBuildFormOnServer passes runtime metadata to db validation adapters', async () => {
  const lookups: Array<Record<string, unknown>> = [];

  configureBuildFormDbValidation({
    async lookup(request) {
      lookups.push({
        runtime: request.runtime,
        formId: request.formId,
        fieldName: request.fieldName,
        operator: request.operator,
        target: request.target.target
      });

      return {
        exists: false
      };
    }
  });

  const form = withBuildFormValidation(
    defineBuildForm({
      id: 'metadata-aware-form',
      fields: [
        buildFormField.email({
          name: 'email',
          label: 'Email'
        })
      ]
    }),
    {
      fields: {
        email: [buildFormRule.unique(dbRef('core.users.email'))]
      }
    }
  );

  const formData = new FormData();
  formData.set('email', 'user@example.com');

  const result = await validateBuildFormOnServer({
    definition: form,
    formData,
    user: {
      id: 1
    }
  });

  assert.equal(result.valid, true);
  assert.deepEqual(lookups, [
    {
      runtime: 'server',
      formId: 'metadata-aware-form',
      fieldName: 'email',
      operator: 'unique',
      target: 'core.users.email'
    }
  ]);
});

test('validateBuildFormOnServer resolves organization and generic template db targets', async () => {
  const lookups: Array<Record<string, unknown>> = [];

  configureBuildFormDbValidation({
    async lookup(request) {
      lookups.push({
        operator: request.operator,
        target: request.target.target,
        value: request.value
      });

      return {
        exists: request.value === '15'
      };
    }
  });

  const form = withBuildFormValidation(
    defineBuildForm({
      fields: [
        buildFormField.select({
          name: 'organizationTemplateId',
          label: 'Organization template',
          options: [
            { value: '', label: 'None' },
            { value: '15', label: 'Business' }
          ]
        }),
        buildFormField.hidden({
          name: 'templateId'
        })
      ]
    }),
    {
      fields: {
        organizationTemplateId: [
          buildFormRule.exists(dbRef('core.subscription_templates.organization'))
        ],
        templateId: [buildFormRule.exists(dbRef('core.subscription_templates.any'))]
      }
    }
  );

  const formData = new FormData();
  formData.set('organizationTemplateId', '15');
  formData.set('templateId', '15');

  const result = await validateBuildFormOnServer({
    definition: form,
    formData,
    user: {
      id: 1
    }
  });

  assert.equal(result.valid, true);
  assert.deepEqual(lookups, [
    {
      operator: 'exists',
      target: 'core.subscription_templates.organization',
      value: '15'
    },
    {
      operator: 'exists',
      target: 'core.subscription_templates.any',
      value: '15'
    }
  ]);
});
