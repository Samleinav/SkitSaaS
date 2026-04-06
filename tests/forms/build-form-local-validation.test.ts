import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFormField,
  defineBuildForm
} from '../../app/sdk/src/forms';
import {
  buildFormRule,
  withBuildFormValidation
} from '../../app/sdk/src/form-validation';
import {
  resolveBuildFormLocalValidationMode,
  runBuildFormLocalValidation
} from '../../lib/forms/validation/local';
import {
  createBuildFormValidationUiState,
  createBuildFormInvalidFactory,
  mergeBuildFormFieldValidationResult,
  resolveBuildFormFirstFieldError
} from '../../lib/forms/validation/results';
import {
  createAdminDeleteUserBuildFormBase,
  createAdminEditUserStatusBuildFormBase
} from '../../app/(dashboard)/admin/users/forms';
import {
  createAdminManageOrganizationSubscriptionBuildFormBase,
  createAdminUpdateUserSubscriptionBuildFormBase
} from '../../app/(dashboard)/admin/suscriptions/forms';
import { createDashboardUpdateAccountBuildFormBase } from '../../app/(dashboard)/dashboard/general/forms';
import {
  createDashboardDeleteAccountBuildFormBase,
  createDashboardUpdatePasswordBuildFormBase
} from '../../app/(dashboard)/dashboard/security/forms';

test('resolveBuildFormLocalValidationMode enables eager hooks and submit gate', () => {
  const form = withBuildFormValidation(
    defineBuildForm({
      id: 'users.create',
      fields: [
        buildFormField.email({
          name: 'email',
          label: 'Email'
        })
      ]
    }),
    {
      client: {
        validateOn: ['blur', 'change']
      },
      fields: {
        email: [buildFormRule.required(), buildFormRule.email()]
      }
    }
  );

  assert.deepEqual(resolveBuildFormLocalValidationMode(form), {
    enabled: true,
    validateOnBlur: true,
    validateOnChange: true,
    validateOnSubmit: true
  });
});

test('runBuildFormLocalValidation delegates to sdk normalization and rules', () => {
  const form = withBuildFormValidation(
    defineBuildForm({
      id: 'profile.edit',
      fields: [
        buildFormField.text({
          name: 'slug',
          label: 'Slug',
          mask: 'slug'
        })
      ]
    }),
    {
      fields: {
        slug: [buildFormRule.required()]
      }
    }
  );

  const formData = new FormData();
  formData.set('slug', ' Hello World ');

  const result = runBuildFormLocalValidation(form, formData);

  assert.equal(result.valid, true);
  assert.deepEqual(result.values, {
    slug: 'hello-world'
  });
});

test('mergeBuildFormFieldValidationResult replaces only the targeted field state', () => {
  const initialState = createBuildFormValidationUiState({
    fieldErrors: {
      email: ['Email is required.'],
      password: ['Password is required.']
    }
  });

  const nextState = mergeBuildFormFieldValidationResult(
    initialState,
    {
      fieldErrors: {},
      formError: null
    },
    'email'
  );

  assert.equal(resolveBuildFormFirstFieldError(nextState, 'email'), null);
  assert.equal(
    resolveBuildFormFirstFieldError(nextState, 'password'),
    'Password is required.'
  );
});

test('admin user status form requires accountStatus locally', () => {
  const form = createAdminEditUserStatusBuildFormBase();
  const formData = new FormData();
  formData.set('userId', '7');
  formData.set('accountStatus', '');
  formData.set('statusReason', 'Manual review required');

  const result = runBuildFormLocalValidation(form, formData);

  assert.equal(result.valid, false);
  assert.deepEqual(result.fieldErrors.accountStatus, [
    'Account status is required.'
  ]);
});

test('admin delete user form requires transferUserId when ownership transfer is required', () => {
  const form = createAdminDeleteUserBuildFormBase({
    transferCandidates: [
      {
        id: 9,
        email: 'owner@example.com'
      }
    ]
  });
  const formData = new FormData();
  formData.set('userId', '7');
  formData.set('requiresTransfer', 'true');
  formData.set('transferUserId', '');
  formData.set('statusReason', 'Cleanup');

  const result = runBuildFormLocalValidation(form, formData);

  assert.equal(result.valid, false);
  assert.deepEqual(result.fieldErrors.transferUserId, [
    'Transfer owned organizations to is required.'
  ]);
});

test('createBuildFormInvalidFactory builds server-style field errors without copy duplication', () => {
  const invalid = createBuildFormInvalidFactory({
    values: {
      itemId: 0
    }
  });

  const result = invalid({
    itemId: ['A valid item id is required.']
  });

  assert.equal(result.valid, false);
  assert.deepEqual(result.fieldErrors.itemId, ['A valid item id is required.']);
});

test('admin user subscription form accepts empty template selection locally', () => {
  const form = createAdminUpdateUserSubscriptionBuildFormBase();
  const formData = new FormData();
  formData.set('userId', '7');
  formData.set('source', '/admin/subscriptions/user/7/edit');
  formData.set('templateId', '');

  const result = runBuildFormLocalValidation(form, formData);

  assert.equal(result.valid, true);
});

test('admin organization subscription form requires subscription status locally', () => {
  const form = createAdminManageOrganizationSubscriptionBuildFormBase();
  const formData = new FormData();
  formData.set('teamId', '4');
  formData.set('source', '/admin/subscriptions/organization/4/edit');
  formData.set('paymentProvider', '');
  formData.set('subscriptionStatus', '');
  formData.set('templateId', '');

  const result = runBuildFormLocalValidation(form, formData);

  assert.equal(result.valid, false);
  assert.deepEqual(result.fieldErrors.subscriptionStatus, [
    'Subscription status is required.'
  ]);
});

test('dashboard update account form requires name and email locally', () => {
  const form = createDashboardUpdateAccountBuildFormBase();
  const formData = new FormData();
  formData.set('userId', '7');
  formData.set('name', '');
  formData.set('email', 'invalid');

  const result = runBuildFormLocalValidation(form, formData);

  assert.equal(result.valid, false);
  assert.deepEqual(result.fieldErrors.name, ['Name is required.']);
  assert.deepEqual(result.fieldErrors.email, [
    'Email must be a valid email address.'
  ]);
});

test('dashboard update password form validates confirmation locally', () => {
  const form = createDashboardUpdatePasswordBuildFormBase();
  const formData = new FormData();
  formData.set('currentPassword', 'current-pass');
  formData.set('newPassword', 'next-password');
  formData.set('confirmPassword', 'different-password');

  const result = runBuildFormLocalValidation(form, formData);

  assert.equal(result.valid, false);
  assert.deepEqual(result.fieldErrors.confirmPassword, [
    'Confirm password confirmation does not match.'
  ]);
});

test('dashboard delete account form requires password locally', () => {
  const form = createDashboardDeleteAccountBuildFormBase();
  const formData = new FormData();
  formData.set('password', '');

  const result = runBuildFormLocalValidation(form, formData);

  assert.equal(result.valid, false);
  assert.deepEqual(result.fieldErrors.password, [
    'Confirm password is required.'
  ]);
});
