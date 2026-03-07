import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFormField,
  defineBuildForm
} from '../../app/sdk/src/forms';
import {
  buildFormValidationPreset,
  buildFormRule,
  createBuildFormValidationResultFromFieldMessages,
  dbRef,
  defineValidatedBuildForm,
  normalizeBuildFormValuesFromFormData,
  resolveBuildFormValidationDebounceMs,
  resolveBuildFormValidationTriggers,
  shouldRunBuildFormPreflight,
  validateBuildFormLocally,
  validationCondition,
  withBuildFormValidation
} from '../../app/sdk/src/form-validation';
import {
  buildFormValidationMessage,
  createCatalogBuildFormValidationMessageResolver,
  normalizeEmail,
  parseOptionalPositiveInt
} from '../../app/sdk/src/validation-messages';

test('validated build form preserves validation metadata and merges new rules', () => {
  const baseForm = defineBuildForm({
    id: 'users.create',
    fields: [
      buildFormField.email({
        name: 'email',
        label: 'Email',
        required: true
      }),
      buildFormField.password({
        name: 'password',
        label: 'Password',
        required: true
      })
    ]
  });

  const form = withBuildFormValidation(baseForm, {
    fields: {
      email: [buildFormRule.required(), buildFormRule.email()]
    },
    preflight: {
      enabled: true,
      validateOn: ['blur'],
      fieldDebounceMs: 450
    }
  });

  const validatedForm = defineValidatedBuildForm({
    ...form,
    validation: {
      ...form.validation,
      fields: {
        ...form.validation.fields,
        password: [buildFormRule.minLength(8)]
      }
    }
  });

  assert.equal(validatedForm.validation.fields?.email?.length, 2);
  assert.equal(validatedForm.validation.fields?.password?.length, 1);
  assert.equal(shouldRunBuildFormPreflight(validatedForm), true);
  assert.deepEqual(resolveBuildFormValidationTriggers(validatedForm, 'preflight'), [
    'blur'
  ]);
  assert.equal(resolveBuildFormValidationDebounceMs(validatedForm), 450);
});

test('normalizeBuildFormValuesFromFormData uses last repeated value and semantic field coercion', () => {
  const form = defineValidatedBuildForm({
    id: 'items.edit',
    fields: [
      buildFormField.text({
        name: 'slug',
        label: 'Slug',
        mask: 'slug'
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
    ],
    validation: {
      fields: {
        slug: [buildFormRule.required()],
        priority: [buildFormRule.integer()]
      }
    }
  });

  const formData = new FormData();
  formData.set('slug', ' Hello World ');
  formData.set('priority', '4');
  formData.append('isPublic', 'false');
  formData.append('isPublic', 'true');

  const values = normalizeBuildFormValuesFromFormData(form, formData);

  assert.deepEqual(values, {
    slug: 'hello-world',
    priority: 4,
    isPublic: true
  });
});

test('validateBuildFormLocally supports common rules, conditions, and skips db rules', () => {
  const form = defineValidatedBuildForm({
    id: 'users.register',
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
        label: 'Terms'
      }),
      buildFormField.text({
        name: 'companyName',
        label: 'Company'
      })
    ],
    validation: {
      fields: {
        email: [
          buildFormRule.required(),
          buildFormRule.email(),
          buildFormRule.unique(dbRef('core.users.email'))
        ],
        password: [buildFormRule.required(), buildFormRule.minLength(8)],
        passwordConfirm: [buildFormRule.confirmed('password')],
        acceptTerms: [buildFormRule.accepted()],
        companyName: [
          buildFormRule.required({
            when: [validationCondition.truthy('acceptTerms')]
          })
        ]
      }
    }
  });

  const invalidResult = validateBuildFormLocally(
    form,
    {
      email: 'invalid-email',
      password: 'short',
      passwordConfirm: 'different',
      acceptTerms: false,
      companyName: ''
    }
  );

  assert.equal(invalidResult.valid, false);
  assert.deepEqual(Object.keys(invalidResult.fieldErrors).sort(), [
    'acceptTerms',
    'email',
    'password',
    'passwordConfirm'
  ]);
  assert.equal(invalidResult.fieldErrors.email?.length, 1);
  assert.equal(invalidResult.fieldErrors.companyName, undefined);

  const conditionalResult = validateBuildFormLocally(
    form,
    {
      email: 'hello@example.com',
      password: 'long-enough',
      passwordConfirm: 'long-enough',
      acceptTerms: true,
      companyName: ''
    }
  );

  assert.equal(conditionalResult.valid, false);
  assert.deepEqual(conditionalResult.fieldErrors.companyName, [
    'Company is required.'
  ]);

  const validResult = validateBuildFormLocally(
    form,
    {
      email: 'hello@example.com',
      password: 'long-enough',
      passwordConfirm: 'long-enough',
      acceptTerms: true,
      companyName: 'Acme'
    }
  );

  assert.equal(validResult.valid, true);
  assert.deepEqual(validResult.fieldErrors, {});
});

test('createBuildFormValidationResultFromFieldMessages resolves descriptors with catalog i18n', () => {
  const resolveMessage = createCatalogBuildFormValidationMessageResolver({
    'build_form.validation.already_exists': '{label} ya existe.',
    'admin.users.validation.self_delete':
      'No puedes eliminar tu propia cuenta de administrador.'
  });

  const result = createBuildFormValidationResultFromFieldMessages({
    values: {
      email: 'test@example.com'
    },
    fieldMessages: {
      email: [buildFormValidationMessage.alreadyExists('Email')]
    },
    formMessage: {
      key: 'admin.users.validation.self_delete',
      fallback: 'You cannot delete your own admin account.'
    },
    resolveMessage,
    source: 'server'
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.fieldErrors.email, ['Email ya existe.']);
  assert.equal(
    result.formError,
    'No puedes eliminar tu propia cuenta de administrador.'
  );
  assert.equal(result.issues[0]?.code, 'build_form.validation.already_exists');
});

test('normalizeEmail and parseOptionalPositiveInt are reusable validation helpers', () => {
  assert.equal(normalizeEmail('  Test@Example.COM  '), 'test@example.com');
  assert.equal(normalizeEmail(null), '');

  assert.deepEqual(parseOptionalPositiveInt(''), {
    value: null,
    valid: true
  });
  assert.deepEqual(parseOptionalPositiveInt('42'), {
    value: 42,
    valid: true
  });
  assert.deepEqual(parseOptionalPositiveInt('0'), {
    value: null,
    valid: false
  });
  assert.deepEqual(parseOptionalPositiveInt('abc'), {
    value: null,
    valid: false
  });
});

test('buildFormValidationPreset.blur centralizes blur and preflight defaults', () => {
  const preset = buildFormValidationPreset.blur(
    {
      email: [buildFormRule.required(), buildFormRule.email()]
    },
    {
      preflight: true
    }
  );

  assert.deepEqual(preset.client?.validateOn, ['blur']);
  assert.equal(preset.preflight?.enabled, true);
  assert.deepEqual(preset.preflight?.validateOn, ['blur']);
  assert.equal(preset.preflight?.fieldDebounceMs, 250);
  assert.equal(preset.fields?.email?.length, 2);
});
