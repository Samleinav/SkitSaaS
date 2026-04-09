import {
  buildFormField,
  defineBuildForm
} from '@skitsaas/sdk';
import type {
  ConfigRow,
  SignupPolicyConfigRow,
  SignupPolicyTemplateOption
} from './config';

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

export type AdminSignupPolicyBuildFormCopy = {
  envPrefix: string;
  sourcePrefix: string;
  overriddenByEnv: string;
  dbFallbackValue: string;
  signupDefaultOrganizationTemplateLabel: string;
  signupDefaultUserTemplateLabel: string;
  signupDefaultOrganizationTemplateDescription: string;
  signupDefaultUserTemplateDescription: string;
  publicFreeOrganizationTemplateLabel: string;
  publicFreeUserTemplateLabel: string;
  publicFreeOrganizationTemplateDescription: string;
  publicFreeUserTemplateDescription: string;
  subscriptionFailureFallbackModeLabel: string;
  subscriptionFailureFallbackModeDescription: string;
  fallbackModeBaselineLabel: string;
  fallbackModePublicFreeLabel: string;
  noneTemplateLabel: string;
};

function formatSignupPolicyMetaDescription({
  base,
  envKey,
  source,
  copy
}: {
  base: string;
  envKey: string;
  source: SignupPolicyConfigRow['source'];
  copy: AdminSignupPolicyBuildFormCopy;
}) {
  return `${base} ${copy.envPrefix}: ${envKey}. ${copy.sourcePrefix}: ${source}.`.trim();
}

function resolveSignupPolicyDefaultValue(row: SignupPolicyConfigRow) {
  return row.dbValue || row.value || '';
}

function createTemplateSelectOptions({
  noneLabel,
  templates
}: {
  noneLabel: string;
  templates: SignupPolicyTemplateOption[];
}) {
  return [
    {
      value: '',
      label: noneLabel
    },
    ...templates.map((template) => ({
      value: String(template.id),
      label: template.label
    }))
  ];
}

export function createAdminSignupPolicyBuildFormBase({
  formId,
  rows,
  organizationTemplateOptions,
  userTemplateOptions,
  freeOrganizationTemplateOptions,
  freeUserTemplateOptions,
  copy
}: {
  formId: string;
  rows: {
    signupDefaultOrganizationTemplateId: SignupPolicyConfigRow;
    signupDefaultUserTemplateId: SignupPolicyConfigRow;
    publicFreeOrganizationTemplateId: SignupPolicyConfigRow;
    publicFreeUserTemplateId: SignupPolicyConfigRow;
    subscriptionFailureFallbackMode: SignupPolicyConfigRow;
  };
  organizationTemplateOptions: SignupPolicyTemplateOption[];
  userTemplateOptions: SignupPolicyTemplateOption[];
  freeOrganizationTemplateOptions: SignupPolicyTemplateOption[];
  freeUserTemplateOptions: SignupPolicyTemplateOption[];
  copy: AdminSignupPolicyBuildFormCopy;
}) {
  return defineBuildForm({
    id: formId,
    layout: {
      columns: 2
    },
    fields: [
      buildFormField.select({
        name: 'signupDefaultOrganizationTemplateId',
        label: copy.signupDefaultOrganizationTemplateLabel,
        description: formatSignupPolicyMetaDescription({
          base: copy.signupDefaultOrganizationTemplateDescription,
          envKey: rows.signupDefaultOrganizationTemplateId.envKey,
          source: rows.signupDefaultOrganizationTemplateId.source,
          copy
        }),
        defaultValue: resolveSignupPolicyDefaultValue(
          rows.signupDefaultOrganizationTemplateId
        ),
        options: createTemplateSelectOptions({
          noneLabel: copy.noneTemplateLabel,
          templates: organizationTemplateOptions
        })
      }),
      buildFormField.select({
        name: 'signupDefaultUserTemplateId',
        label: copy.signupDefaultUserTemplateLabel,
        description: formatSignupPolicyMetaDescription({
          base: copy.signupDefaultUserTemplateDescription,
          envKey: rows.signupDefaultUserTemplateId.envKey,
          source: rows.signupDefaultUserTemplateId.source,
          copy
        }),
        defaultValue: resolveSignupPolicyDefaultValue(
          rows.signupDefaultUserTemplateId
        ),
        options: createTemplateSelectOptions({
          noneLabel: copy.noneTemplateLabel,
          templates: userTemplateOptions
        })
      }),
      buildFormField.select({
        name: 'subscriptionFailureFallbackMode',
        label: copy.subscriptionFailureFallbackModeLabel,
        description: formatSignupPolicyMetaDescription({
          base: copy.subscriptionFailureFallbackModeDescription,
          envKey: rows.subscriptionFailureFallbackMode.envKey,
          source: rows.subscriptionFailureFallbackMode.source,
          copy
        }),
        defaultValue: resolveSignupPolicyDefaultValue(
          rows.subscriptionFailureFallbackMode
        ),
        options: [
          {
            value: 'baseline',
            label: copy.fallbackModeBaselineLabel
          },
          {
            value: 'public_free',
            label: copy.fallbackModePublicFreeLabel
          }
        ]
      }),
      buildFormField.select({
        name: 'publicFreeOrganizationTemplateId',
        label: copy.publicFreeOrganizationTemplateLabel,
        description: formatSignupPolicyMetaDescription({
          base: copy.publicFreeOrganizationTemplateDescription,
          envKey: rows.publicFreeOrganizationTemplateId.envKey,
          source: rows.publicFreeOrganizationTemplateId.source,
          copy
        }),
        defaultValue: resolveSignupPolicyDefaultValue(
          rows.publicFreeOrganizationTemplateId
        ),
        options: createTemplateSelectOptions({
          noneLabel: copy.noneTemplateLabel,
          templates: freeOrganizationTemplateOptions
        })
      }),
      buildFormField.select({
        name: 'publicFreeUserTemplateId',
        label: copy.publicFreeUserTemplateLabel,
        description: formatSignupPolicyMetaDescription({
          base: copy.publicFreeUserTemplateDescription,
          envKey: rows.publicFreeUserTemplateId.envKey,
          source: rows.publicFreeUserTemplateId.source,
          copy
        }),
        defaultValue: resolveSignupPolicyDefaultValue(
          rows.publicFreeUserTemplateId
        ),
        options: createTemplateSelectOptions({
          noneLabel: copy.noneTemplateLabel,
          templates: freeUserTemplateOptions
        })
      })
    ]
  });
}
