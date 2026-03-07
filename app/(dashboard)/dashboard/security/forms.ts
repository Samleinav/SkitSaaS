import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  defineBuildForm,
  withBuildFormValidation
} from '@skitsaas/sdk';

export type DashboardUpdatePasswordFormCopy = {
  currentPasswordLabel: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
};

export type DashboardDeleteAccountFormCopy = {
  passwordLabel: string;
};

const DEFAULT_DASHBOARD_UPDATE_PASSWORD_FORM_COPY: DashboardUpdatePasswordFormCopy =
  {
    currentPasswordLabel: 'Current password',
    newPasswordLabel: 'New password',
    confirmPasswordLabel: 'Confirm password'
  };

const DEFAULT_DASHBOARD_DELETE_ACCOUNT_FORM_COPY: DashboardDeleteAccountFormCopy =
  {
    passwordLabel: 'Confirm password'
  };

export function createDashboardUpdatePasswordBuildFormBase({
  copy = DEFAULT_DASHBOARD_UPDATE_PASSWORD_FORM_COPY
}: {
  copy?: DashboardUpdatePasswordFormCopy;
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'dashboard-update-password-form',
      fields: [
        buildFormField.password({
          name: 'currentPassword',
          label: copy.currentPasswordLabel,
          required: true,
          autoComplete: 'current-password',
          minLength: 8,
          maxLength: 100
        }),
        buildFormField.password({
          name: 'newPassword',
          label: copy.newPasswordLabel,
          required: true,
          autoComplete: 'new-password',
          minLength: 8,
          maxLength: 100
        }),
        buildFormField.password({
          name: 'confirmPassword',
          label: copy.confirmPasswordLabel,
          required: true,
          minLength: 8,
          maxLength: 100
        })
      ]
    }),
    buildFormValidationPreset.blur({
      currentPassword: [
        buildFormRule.required(),
        buildFormRule.minLength(8)
      ],
      newPassword: [buildFormRule.required(), buildFormRule.minLength(8)],
      confirmPassword: [
        buildFormRule.required(),
        buildFormRule.confirmed('newPassword')
      ]
    })
  );
}

export function createDashboardDeleteAccountBuildFormBase({
  copy = DEFAULT_DASHBOARD_DELETE_ACCOUNT_FORM_COPY
}: {
  copy?: DashboardDeleteAccountFormCopy;
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'dashboard-delete-account-form',
      fields: [
        buildFormField.password({
          name: 'password',
          label: copy.passwordLabel,
          required: true,
          minLength: 8,
          maxLength: 100
        })
      ]
    }),
    buildFormValidationPreset.blur({
      password: [buildFormRule.required(), buildFormRule.minLength(8)]
    })
  );
}
