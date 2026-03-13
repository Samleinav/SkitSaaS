import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  defineBuildForm,
  withBuildFormValidation,
} from '@skitsaas/sdk';

export function createExampleAdminBroadcastFormDefinition() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'mod.example.admin.broadcast-form',
      sections: [
        {
          id: 'content',
          title: 'FormBuilder Demo',
          description:
            'Validated with the SDK controller. This example intentionally skips DB writes.',
          columns: 2,
          fields: [
            buildFormField.text({
              name: 'campaignName',
              label: 'Campaign name',
              placeholder: 'April admin rollout',
              required: true,
              maxLength: 80,
              colSpan: 'full',
            }),
            buildFormField.select({
              name: 'targetScope',
              label: 'Target scope',
              options: [
                { value: 'admins', label: 'Admins only' },
                { value: 'owners', label: 'Owners' },
                { value: 'all', label: 'All members' },
              ],
            }),
            buildFormField.number({
              name: 'reviewWindowMinutes',
              label: 'Review window (minutes)',
              min: 5,
              max: 120,
              defaultValue: 20,
            }),
            buildFormField.textarea({
              name: 'message',
              label: 'Message',
              rows: 4,
              placeholder:
                'Explain what changed and why this is a good example for module authors.',
              required: true,
              maxLength: 320,
              colSpan: 'full',
            }),
            buildFormField.checkbox({
              name: 'includeChecklist',
              label: 'Attach rollout checklist',
              description:
                'Useful for showing confirmable and validated module actions.',
              checkedValue: 'true',
              uncheckedValue: 'false',
              colSpan: 'full',
            }),
          ],
        },
      ],
    }),
    buildFormValidationPreset.blur({
      campaignName: [buildFormRule.required(), buildFormRule.maxLength(80)],
      targetScope: [buildFormRule.required()],
      reviewWindowMinutes: [
        buildFormRule.required(),
        buildFormRule.integer(),
        buildFormRule.min(5),
        buildFormRule.max(120),
      ],
      message: [buildFormRule.required(), buildFormRule.maxLength(320)],
    })
  );
}
