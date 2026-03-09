import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  dbRef,
  defineBuildForm,
  fieldRef,
  withBuildFormValidation
} from '@skitsaas/sdk';

export type DashboardUpdateAccountFormCopy = {
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
};

const DEFAULT_DASHBOARD_UPDATE_ACCOUNT_FORM_COPY: DashboardUpdateAccountFormCopy = {
  nameLabel: 'Name',
  namePlaceholder: 'Enter your name',
  emailLabel: 'Email',
  emailPlaceholder: 'Enter your email'
};

export function createDashboardUpdateAccountBuildFormBase({
  copy = DEFAULT_DASHBOARD_UPDATE_ACCOUNT_FORM_COPY
}: {
  copy?: DashboardUpdateAccountFormCopy;
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'dashboard-update-account-form',
      layout: { columns: 2 },
      fields: [
        buildFormField.hidden({
          name: 'userId'
        }),
        buildFormField.text({
          name: 'name',
          label: copy.nameLabel,
          placeholder: copy.namePlaceholder,
          required: true,
          maxLength: 100
        }),
        buildFormField.email({
          name: 'email',
          label: copy.emailLabel,
          placeholder: copy.emailPlaceholder,
          required: true,
          maxLength: 255
        })
      ]
    }),
    buildFormValidationPreset.blur(
      {
        name: [buildFormRule.required()],
        email: [
          buildFormRule.required(),
          buildFormRule.email(),
          buildFormRule.unique(dbRef('core.users.email'), {
            ignore: fieldRef('userId')
          })
        ]
      },
      {
        preflight: true
      }
    )
  );
}
