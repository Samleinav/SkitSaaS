import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  defineBuildForm,
  withBuildFormValidation,
} from '@skitsaas/sdk';

export function createExampleDashboardIntakeFormDefinition() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'mod.example.dashboard.intake-form',
      layout: {
        columns: 2,
      },
      fields: [
        buildFormField.text({
          name: 'requestName',
          label: 'Request name',
          required: true,
          maxLength: 90,
          placeholder: 'Q2 partner portal refresh',
          colSpan: 'full',
        }),
        buildFormField.select({
          name: 'priorityBand',
          label: 'Priority',
          options: [
            { value: 'foundation', label: 'Foundation' },
            { value: 'growth', label: 'Growth' },
            { value: 'launch', label: 'Launch' },
          ],
        }),
        buildFormField.select({
          name: 'deliveryArea',
          label: 'Delivery area',
          options: [
            { value: 'dashboard', label: 'Dashboard' },
            { value: 'frontend', label: 'Frontend' },
            { value: 'portal', label: 'Portal' },
          ],
        }),
        buildFormField.textarea({
          name: 'notes',
          label: 'Notes',
          rows: 4,
          placeholder:
            'This is a no-op mutation that exists only to show SDK validation + host form UX.',
          maxLength: 300,
          colSpan: 'full',
        }),
        buildFormField.checkbox({
          name: 'needsRemoteTable',
          label: 'Needs remote DataTable',
          description:
            'Use this to mirror the source.url example on the frontend page.',
          checkedValue: 'true',
          uncheckedValue: 'false',
          colSpan: 'full',
        }),
      ],
    }),
    buildFormValidationPreset.blur({
      requestName: [buildFormRule.required(), buildFormRule.maxLength(90)],
      priorityBand: [buildFormRule.required()],
      deliveryArea: [buildFormRule.required()],
      notes: [buildFormRule.maxLength(300)],
    })
  );
}
