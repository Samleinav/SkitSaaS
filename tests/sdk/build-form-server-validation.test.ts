import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createValidatedServerActionController,
  createFormReader,
  createValidBuildFormResult,
  configureRevalidation,
  validateBuildFormOnServer,
  validateBuildFormWithHandler
} from '../../app/sdk/src/server';
import { buildFormField, defineBuildForm } from '../../app/sdk/src/forms';
import {
  buildFormRule,
  createBuildFormValidationResultFromFieldErrors,
  withBuildFormValidation
} from '../../app/sdk/src/form-validation';

test('createFormReader returns the last repeated value and exposes all values', () => {
  const formData = new FormData();
  formData.set('title', ' Launch ');
  formData.append('flag', 'false');
  formData.append('flag', 'true');

  const form = createFormReader(formData);

  assert.equal(form.string('title'), 'Launch');
  assert.equal(form.value('flag'), 'true');
  assert.deepEqual(form.values('flag'), ['false', 'true']);
});

test('validateBuildFormWithHandler normalizes form data before invoking the validator', async () => {
  const definition = defineBuildForm({
    fields: [
      buildFormField.text({
        name: 'title',
        label: 'Title'
      }),
      buildFormField.number({
        name: 'priority',
        label: 'Priority'
      }),
      buildFormField.checkbox({
        name: 'isPublic',
        label: 'Public',
        checkedValue: 'true',
        uncheckedValue: 'false'
      })
    ]
  });

  const formData = new FormData();
  formData.set('title', ' Launch checklist ');
  formData.set('priority', '3');
  formData.append('isPublic', 'false');
  formData.append('isPublic', 'true');

  const result = await validateBuildFormWithHandler({
    definition,
    formData,
    user: {
      id: 7
    },
    validator(context) {
      assert.equal(context.user.id, 7);
      assert.equal(context.form.value('isPublic'), 'true');
      assert.deepEqual(context.values, {
        title: 'Launch checklist',
        priority: 3,
        isPublic: true
      });

      return createValidBuildFormResult(context.values);
    }
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.values, {
    title: 'Launch checklist',
    priority: 3,
    isPublic: true
  });
});

test('validateBuildFormOnServer runs VineJS-backed rule validation and custom validators', async () => {
  const form = withBuildFormValidation(
    defineBuildForm({
      fields: [
        buildFormField.email({
          name: 'email',
          label: 'Email'
        }),
        buildFormField.password({
          name: 'password',
          label: 'Password'
        }),
        buildFormField.password({
          name: 'passwordConfirm',
          label: 'Password confirmation'
        }),
        buildFormField.checkbox({
          name: 'acceptTerms',
          label: 'Terms',
          checkedValue: 'true',
          uncheckedValue: 'false'
        })
      ]
    }),
    {
      fields: {
        email: [buildFormRule.required(), buildFormRule.email()],
        password: [buildFormRule.required(), buildFormRule.minLength(8)],
        passwordConfirm: [buildFormRule.confirmed('password')],
        acceptTerms: [buildFormRule.accepted()]
      }
    }
  );

  const invalidFormData = new FormData();
  invalidFormData.set('email', 'invalid');
  invalidFormData.set('password', 'short');
  invalidFormData.set('passwordConfirm', 'different');
  invalidFormData.append('acceptTerms', 'false');

  const invalidResult = await validateBuildFormOnServer({
    definition: form,
    formData: invalidFormData,
    user: {
      id: 1
    }
  });

  assert.equal(invalidResult.valid, false);
  assert.deepEqual(Object.keys(invalidResult.fieldErrors).sort(), [
    'acceptTerms',
    'email',
    'password',
    'passwordConfirm'
  ]);

  const validFormData = new FormData();
  validFormData.set('email', 'taken@example.com');
  validFormData.set('password', 'long-enough');
  validFormData.set('passwordConfirm', 'long-enough');
  validFormData.append('acceptTerms', 'true');

  const customInvalidResult = await validateBuildFormOnServer({
    definition: form,
    formData: validFormData,
    user: {
      id: 1
    },
    validator({ values }) {
      if (values.email === 'taken@example.com') {
        return createBuildFormValidationResultFromFieldErrors({
          values,
          fieldErrors: {
            email: ['Email is already in use.']
          },
          source: 'server'
        });
      }

      return createValidBuildFormResult(values);
    }
  });

  assert.equal(customInvalidResult.valid, false);
  assert.deepEqual(customInvalidResult.fieldErrors.email, [
    'Email is already in use.'
  ]);
});

test('createValidatedServerActionController blocks invalid submissions and revalidates only on success', async () => {
  const revalidatedPaths: string[] = [];
  configureRevalidation({
    revalidatePath(path) {
      revalidatedPaths.push(path);
    }
  });

  const form = withBuildFormValidation(
    defineBuildForm({
      fields: [
        buildFormField.text({
          name: 'title',
          label: 'Title'
        })
      ]
    }),
    {
      fields: {
        title: [buildFormRule.required(), buildFormRule.minLength(4)]
      }
    }
  );

  let handlerCalls = 0;
  const controller = createValidatedServerActionController({
    requireUser: async () => ({
      id: 7
    })
  });

  const action = controller(
    form,
    async ({ values }) => {
      handlerCalls += 1;

      if (values.title === 'taken') {
        return createBuildFormValidationResultFromFieldErrors({
          values,
          fieldErrors: {
            title: ['Title is already reserved.']
          },
          source: 'server'
        });
      }
    },
    {
      revalidatePaths: ['/admin/items']
    }
  );

  const invalidFormData = new FormData();
  invalidFormData.set('title', 'abc');

  const invalidResult = await action(invalidFormData);
  assert.equal(invalidResult.valid, false);
  assert.equal(handlerCalls, 0);
  assert.deepEqual(revalidatedPaths, []);

  const customInvalidFormData = new FormData();
  customInvalidFormData.set('title', 'taken');

  const customInvalidResult = await action(customInvalidFormData);
  assert.equal(customInvalidResult.valid, false);
  assert.equal(handlerCalls, 1);
  assert.deepEqual(customInvalidResult.fieldErrors.title, [
    'Title is already reserved.'
  ]);
  assert.deepEqual(revalidatedPaths, []);

  const validFormData = new FormData();
  validFormData.set('title', 'launch plan');

  const validResult = await action(validFormData);
  assert.equal(validResult.valid, true);
  assert.equal(handlerCalls, 2);
  assert.deepEqual(revalidatedPaths, ['/admin/items']);
});

test('createValidatedServerActionController supports useActionState-compatible invocation', async () => {
  const form = withBuildFormValidation(
    defineBuildForm({
      fields: [
        buildFormField.text({
          name: 'title',
          label: 'Title'
        })
      ]
    }),
    {
      fields: {
        title: [buildFormRule.required(), buildFormRule.minLength(4)]
      }
    }
  );

  const controller = createValidatedServerActionController({
    requireUser: async () => ({
      id: 3
    })
  });

  const action = controller(form, async ({ values }) => {
    return createValidBuildFormResult(values);
  });

  const previousState = createBuildFormValidationResultFromFieldErrors({
    values: {
      title: 'old'
    },
    fieldErrors: {
      title: ['Old error']
    },
    source: 'server'
  });

  const formData = new FormData();
  formData.set('title', 'launch plan');

  const result = await action(previousState, formData);
  assert.equal(result.valid, true);
  assert.deepEqual(result.fieldErrors, {});
  assert.equal(result.formError, null);
  assert.deepEqual(result.values, {
    title: 'launch plan'
  });
});
