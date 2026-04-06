import {
  buildFormField,
  defineBuildForm
} from '@skitsaas/sdk';
import type { ConfigRow } from './config';

export type AdminProviderConfigBuildFormCopy = {
  envPrefix: string;
  sourcePrefix: string;
  overriddenByEnv: string;
  dbFallbackValue: string;
  enabledLabel?: string;
  disabledLabel?: string;
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
