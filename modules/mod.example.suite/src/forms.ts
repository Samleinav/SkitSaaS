import {
  buildFormField,
  buildFormValidationPreset,
  buildFormRule,
  defineBuildForm,
  defineBuildFormSection,
  withBuildFormValidation
} from '@skitsaas/sdk';
import {
  EXAMPLE_SUITE_DEFAULT_PRIORITY,
  EXAMPLE_SUITE_ITEM_STATUSES,
  EXAMPLE_SUITE_MAX_PRIORITY,
  EXAMPLE_SUITE_MIN_PRIORITY
} from './constants';

function createExampleSuiteStatusOptions() {
  return EXAMPLE_SUITE_ITEM_STATUSES.map((status) => ({
    value: status,
    label: status
  }));
}

export function createExampleSuiteAdminItemFormDefinition() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'example-suite-admin-item-form',
      layout: {
        columns: 2
      },
      fields: [
        buildFormField.text({
          name: 'title',
          label: 'Title',
          required: true,
          maxLength: 120,
          placeholder: 'Campaign launch checklist',
          colSpan: 'full'
        }),
        buildFormField.textarea({
          name: 'description',
          label: 'Description',
          rows: 4,
          placeholder: 'Optional details for dashboard and API consumers.',
          colSpan: 'full'
        }),
        buildFormField.select({
          name: 'status',
          label: 'Status',
          options: createExampleSuiteStatusOptions()
        }),
        buildFormField.number({
          name: 'priority',
          label: 'Priority (1-5)',
          min: EXAMPLE_SUITE_MIN_PRIORITY,
          max: EXAMPLE_SUITE_MAX_PRIORITY,
          defaultValue: EXAMPLE_SUITE_DEFAULT_PRIORITY
        }),
        buildFormField.checkbox({
          name: 'isPublic',
          label: 'Expose item in public API listing',
          description:
            'When enabled, the record is included in public-facing listings.',
          checkedValue: 'true',
          uncheckedValue: 'false',
          colSpan: 'full'
        })
      ]
    }),
    buildFormValidationPreset.blur({
        title: [buildFormRule.required(), buildFormRule.maxLength(120)],
        status: [buildFormRule.required()],
        priority: [
          buildFormRule.integer(),
          buildFormRule.min(EXAMPLE_SUITE_MIN_PRIORITY),
          buildFormRule.max(EXAMPLE_SUITE_MAX_PRIORITY)
        ]
      })
  );
}

export function createExampleSuiteDashboardItemFormDefinition() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'example-suite-dashboard-item-form',
      layout: {
        columns: 2
      },
      fields: [
        buildFormField.text({
          name: 'title',
          label: 'Title',
          required: true,
          maxLength: 120,
          placeholder: 'Dashboard-owned record',
          colSpan: 'full'
        }),
        buildFormField.textarea({
          name: 'description',
          label: 'Description',
          rows: 4,
          placeholder: 'Visible to other users when the item is public.',
          colSpan: 'full'
        }),
        buildFormField.number({
          name: 'priority',
          label: 'Priority (1-5)',
          min: EXAMPLE_SUITE_MIN_PRIORITY,
          max: EXAMPLE_SUITE_MAX_PRIORITY,
          defaultValue: EXAMPLE_SUITE_DEFAULT_PRIORITY
        }),
        buildFormField.checkbox({
          name: 'isPublic',
          label: 'Expose item in public API listing',
          description: 'The dashboard example uses the same module-owned table.',
          checkedValue: 'true',
          uncheckedValue: 'false',
          colSpan: 'full'
        })
      ]
    }),
    buildFormValidationPreset.blur({
      title: [buildFormRule.required(), buildFormRule.maxLength(120)],
      priority: [
        buildFormRule.integer(),
        buildFormRule.min(EXAMPLE_SUITE_MIN_PRIORITY),
        buildFormRule.max(EXAMPLE_SUITE_MAX_PRIORITY)
      ]
    })
  );
}

export function createExampleSuiteSettingsFormDefinition() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'example-suite-admin-settings-form',
      sections: [
        defineBuildFormSection({
          id: 'behavior',
          title: 'Behavior',
          description:
            'Control who can create records and which authenticated users can write through the API.',
          columns: 2,
          fields: [
            buildFormField.checkbox({
              name: 'allowDashboardCreate',
              label: 'Allow dashboard users to create records',
              description:
                'When enabled, dashboard members can create records from the private area.',
              checkedValue: 'true',
              uncheckedValue: 'false',
              colSpan: 'full'
            }),
            buildFormField.select({
              name: 'apiWriteMode',
              label: 'API write mode',
              options: [
                {
                  value: 'authenticated',
                  label: 'authenticated users'
                },
                {
                  value: 'admin',
                  label: 'admins only'
                }
              ]
            })
          ]
        }),
        defineBuildFormSection({
          id: 'defaults',
          title: 'Defaults',
          description: 'Choose the default state used when new records are created.',
          columns: 1,
          fields: [
            buildFormField.select({
              name: 'defaultStatus',
              label: 'Default status for new records',
              options: createExampleSuiteStatusOptions()
            })
          ]
        })
      ],
      submit: {
        idleLabel: 'Save Settings',
        pendingLabel: 'Saving...',
        successLabel: 'Saved',
        align: 'start'
      }
    }),
    buildFormValidationPreset.blur({
        apiWriteMode: [buildFormRule.required()],
        defaultStatus: [buildFormRule.required()]
      })
  );
}

export function createExampleSuiteAdminEditItemFormDefinition() {
  const baseDefinition = createExampleSuiteAdminItemFormDefinition();

  return withBuildFormValidation(
    defineBuildForm({
      ...baseDefinition,
      id: 'example-suite-admin-edit-item-form',
      fields: [
        buildFormField.hidden({
          name: 'itemId'
        }),
        ...(baseDefinition.fields ?? [])
      ]
    }),
    {
      ...baseDefinition.validation,
      fields: {
        itemId: [
          buildFormRule.required(),
          buildFormRule.integer(),
          buildFormRule.min(1)
        ],
        ...(baseDefinition.validation.fields ?? {})
      }
    }
  );
}
