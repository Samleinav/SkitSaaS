import {
  buildFormField,
  defineBuildForm,
  withBuildFormValidation
} from '@skitsaas/sdk';

export function createDashboardCancelUserSubscriptionBuildFormBase() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'dashboard-cancel-user-subscription-form'
    }),
    {}
  );
}

export function createDashboardManageOrganizationSubscriptionBuildFormBase() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'dashboard-manage-organization-subscription-form',
      fields: [
        buildFormField.hidden({
          name: 'teamId'
        })
      ]
    }),
    {}
  );
}
