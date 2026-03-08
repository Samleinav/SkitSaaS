import {
  buildFormField,
  buildFormRule,
  buildFormValidationPreset,
  defineBuildForm,
  validationCondition,
  withBuildFormValidation
} from '@skitsaas/sdk';
import type { ConfigRow } from './config';

export type AdminOrganizationControlsBuildFormCopy = {
  allowMultiOrganizationsLabel: string;
  allowMultiOrganizationsHint: string;
  maxOrganizationsPerUserLabel: string;
  maxOrganizationsPerUserHint: string;
  unlimitedPlaceholder: string;
  envPrefix: string;
  sourcePrefix: string;
};

export type AdminProviderConfigBuildFormCopy = {
  envPrefix: string;
  sourcePrefix: string;
  overriddenByEnv: string;
  dbFallbackValue: string;
  enabledLabel?: string;
  disabledLabel?: string;
};

const DEFAULT_ADMIN_ORGANIZATION_CONTROLS_BUILD_FORM_COPY: AdminOrganizationControlsBuildFormCopy =
  {
    allowMultiOrganizationsLabel: 'Allow multiple organizations',
    allowMultiOrganizationsHint:
      'Allow each user account to own or belong to more than one organization.',
    maxOrganizationsPerUserLabel: 'Maximum organizations per user',
    maxOrganizationsPerUserHint:
      'Leave empty to allow unlimited organizations when multi-organization mode is enabled.',
    unlimitedPlaceholder: 'Unlimited',
    envPrefix: 'ENV',
    sourcePrefix: 'Source'
  };

const DEFAULT_ADMIN_PROVIDER_CONFIG_BUILD_FORM_COPY: AdminProviderConfigBuildFormCopy =
  {
    envPrefix: 'ENV',
    sourcePrefix: 'Source',
    overriddenByEnv: 'Overridden by environment value',
    dbFallbackValue: 'Stored database value',
    enabledLabel: 'true',
    disabledLabel: 'false'
  };

function formatConfigMetaDescription({
  base,
  envKey,
  source,
  envPrefix,
  sourcePrefix
}: {
  base: string;
  envKey: string;
  source: ConfigRow['source'];
  envPrefix: string;
  sourcePrefix: string;
}) {
  return `${base} ${envPrefix}: ${envKey}. ${sourcePrefix}: ${source}.`.trim();
}

function createProviderConfigField({
  row,
  copy
}: {
  row: ConfigRow;
  copy: AdminProviderConfigBuildFormCopy;
}) {
  const name = `configValues.${row.configKey}`;
  const label = `${row.provider}.${row.configKey}`;
  const description = formatConfigMetaDescription({
    base:
      row.source === 'env'
        ? copy.overriddenByEnv
        : copy.dbFallbackValue,
    envKey: row.envKey,
    source: row.source,
    envPrefix: copy.envPrefix,
    sourcePrefix: copy.sourcePrefix
  });

  if (row.configKey === 'enabled') {
    return buildFormField.select({
      name,
      label,
      description,
      defaultValue: row.dbValue || row.value || 'true',
      options: [
        {
          value: 'true',
          label: copy.enabledLabel ?? 'true'
        },
        {
          value: 'false',
          label: copy.disabledLabel ?? 'false'
        }
      ]
    });
  }

  const type = row.configKey.toLowerCase().includes('password')
    ? 'password'
    : 'text';

  return type === 'password'
    ? buildFormField.password({
        name,
        label,
        description,
        defaultValue: row.dbValue,
        placeholder:
          row.source === 'env'
            ? copy.overriddenByEnv
            : copy.dbFallbackValue
      })
    : buildFormField.text({
        name,
        label,
        description,
        defaultValue: row.dbValue,
        placeholder:
          row.source === 'env'
            ? copy.overriddenByEnv
            : copy.dbFallbackValue
      });
}

export function createAdminOrganizationControlsBuildFormBase({
  copy = DEFAULT_ADMIN_ORGANIZATION_CONTROLS_BUILD_FORM_COPY,
  allowMultiOrganizationsEnvKey,
  allowMultiOrganizationsSource,
  maxOrganizationsPerUserEnvKey,
  maxOrganizationsPerUserSource
}: {
  copy?: AdminOrganizationControlsBuildFormCopy;
  allowMultiOrganizationsEnvKey?: string;
  allowMultiOrganizationsSource?: ConfigRow['source'];
  maxOrganizationsPerUserEnvKey?: string;
  maxOrganizationsPerUserSource?: ConfigRow['source'];
} = {}) {
  return withBuildFormValidation(
    defineBuildForm({
      id: 'admin-app-config-general-form',
      layout: {
        columns: 1
      },
      fields: [
        buildFormField.checkbox({
          name: 'allowMultiOrganizations',
          label: copy.allowMultiOrganizationsLabel,
          description: formatConfigMetaDescription({
            base: copy.allowMultiOrganizationsHint,
            envKey:
              allowMultiOrganizationsEnvKey ??
              'NEXT_PUBLIC_ALLOW_MULTI_ORGANIZATIONS',
            source: allowMultiOrganizationsSource ?? 'default',
            envPrefix: copy.envPrefix,
            sourcePrefix: copy.sourcePrefix
          }),
          uncheckedValue: 'false'
        }),
        buildFormField.number({
          name: 'maxOrganizationsPerUser',
          label: copy.maxOrganizationsPerUserLabel,
          description: formatConfigMetaDescription({
            base: copy.maxOrganizationsPerUserHint,
            envKey:
              maxOrganizationsPerUserEnvKey ??
              'NEXT_PUBLIC_MAX_ORGANIZATIONS_PER_USER',
            source: maxOrganizationsPerUserSource ?? 'default',
            envPrefix: copy.envPrefix,
            sourcePrefix: copy.sourcePrefix
          }),
          placeholder: copy.unlimitedPlaceholder,
          min: 1,
          step: 1,
          inputMode: 'numeric'
        })
      ]
    }),
    buildFormValidationPreset.blur(
      {
        maxOrganizationsPerUser: [
          buildFormRule.integer({
            when: [validationCondition.truthy('allowMultiOrganizations')]
          }),
          buildFormRule.min(1, {
            when: [validationCondition.truthy('allowMultiOrganizations')]
          })
        ]
      },
      {
        validateOn: ['change', 'submit']
      }
    )
  );
}

export function createAdminProviderConfigBuildFormBase({
  formId,
  provider,
  rows,
  copy = DEFAULT_ADMIN_PROVIDER_CONFIG_BUILD_FORM_COPY
}: {
  formId: string;
  provider: string;
  rows: ConfigRow[];
  copy?: AdminProviderConfigBuildFormCopy;
}) {
  return defineBuildForm({
    id: formId,
    layout: {
      columns: 1
    },
    fields: [
      buildFormField.hidden({
        name: 'provider',
        defaultValue: provider
      }),
      ...rows.map((row) => createProviderConfigField({ row, copy }))
    ]
  });
}
