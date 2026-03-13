import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  defineBuildForm,
  defineBuildFormSection,
  withBuildFormValidation
} from '@skitsaas/sdk';
import {
  EXAMPLE_PACKAGE_DEFAULT_PRIORITY,
  EXAMPLE_PACKAGE_ITEM_STATUSES,
  EXAMPLE_PACKAGE_MAX_PRIORITY,
  EXAMPLE_PACKAGE_MIN_PRIORITY
} from './constants.js';

function createExamplePackageStatusOptions() {
  return EXAMPLE_PACKAGE_ITEM_STATUSES.map((status) => ({
    value: status,
    label: status
  }));
}

export function createExamplePackageAdminItemFormDefinition() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'mod.example.package.admin-item-form',
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
          placeholder: 'Optional details for dashboard and API.',
          colSpan: 'full'
        }),
        buildFormField.select({
          name: 'status',
          label: 'Status',
          options: createExamplePackageStatusOptions()
        }),
        buildFormField.number({
          name: 'priority',
          label: 'Priority (1-5)',
          min: EXAMPLE_PACKAGE_MIN_PRIORITY,
          max: EXAMPLE_PACKAGE_MAX_PRIORITY,
          defaultValue: EXAMPLE_PACKAGE_DEFAULT_PRIORITY
        }),
        buildFormField.checkbox({
          name: 'isPublic',
          label: 'Expose item in public API listing',
          description: 'When enabled, the record is included in public-facing lists.',
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
        buildFormRule.min(EXAMPLE_PACKAGE_MIN_PRIORITY),
        buildFormRule.max(EXAMPLE_PACKAGE_MAX_PRIORITY)
      ]
    })
  );
}

export function createExamplePackageAdminEditItemFormDefinition() {
  const baseDefinition = createExamplePackageAdminItemFormDefinition();

  return withBuildFormValidation(
    defineBuildForm({
      ...baseDefinition,
      id: 'mod.example.package.admin-edit-item-form',
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
        ...(baseDefinition.validation?.fields ?? {})
      }
    }
  );
}

export function createExamplePackageSettingsFormDefinition() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'mod.example.package.settings-form',
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
              options: createExamplePackageStatusOptions()
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

export function createExamplePackageDashboardItemFormDefinition() {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'mod.example.package.dashboard-item-form',
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
          min: EXAMPLE_PACKAGE_MIN_PRIORITY,
          max: EXAMPLE_PACKAGE_MAX_PRIORITY,
          defaultValue: EXAMPLE_PACKAGE_DEFAULT_PRIORITY
        }),
        buildFormField.checkbox({
          name: 'isPublic',
          label: 'Expose item in public API listing',
          description: 'This uses the same module-owned table as the admin routes.',
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
        buildFormRule.min(EXAMPLE_PACKAGE_MIN_PRIORITY),
        buildFormRule.max(EXAMPLE_PACKAGE_MAX_PRIORITY)
      ]
    })
  );
}
