import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  dbRef,
  defineBuildForm,
  withBuildFormValidation
} from '@skitsaas/sdk';

export function createAdminRequestTemplateActiveUpdateBuildFormBase() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-request-template-active-update-form',
      fields: [
        buildFormField.hidden({
          name: 'templateId'
        })
      ]
    }),
    buildFormValidationPreset.blur({
      templateId: [buildFormRule.exists(dbRef('core.subscription_templates.any'))]
    })
  );
}

export function createAdminDeleteSubscriptionTemplateBuildFormBase() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-delete-subscription-template-form',
      fields: [
        buildFormField.hidden({
          name: 'templateId'
        })
      ]
    }),
    buildFormValidationPreset.blur({
      templateId: [buildFormRule.exists(dbRef('core.subscription_templates.any'))]
    })
  );
}
