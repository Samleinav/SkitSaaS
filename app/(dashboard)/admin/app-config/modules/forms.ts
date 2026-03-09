import {
  buildFormField,
  composeBuildFormDefinition,
  defineBuildForm,
  type BuildFormDefinition
} from '@skitsaas/sdk';
import type { AdminMessages } from '@/lib/i18n/messages/admin';
import { upsertModuleRuntimeConfigAction } from './actions';
import type {
  AdminAppConfigModuleItem,
  AdminModuleRuntimeConfigFieldState,
  ModuleConfigSource
} from './config';

type AdminModuleRuntimeConfigBuildFormCopy = {
  envPrefix: string;
  sourcePrefix: string;
  overriddenByEnv: string;
  dbFallbackValue: string;
  save: string;
  saving: string;
};

function formatConfigMetaDescription({
  base,
  envKey,
  source,
  copy
}: {
  base: string;
  envKey: string;
  source: ModuleConfigSource;
  copy: AdminModuleRuntimeConfigBuildFormCopy;
}) {
  return `${base} ${copy.envPrefix}: ${envKey}. ${copy.sourcePrefix}: ${source}.`.trim();
}

function resolveFieldPlaceholder(
  field: AdminModuleRuntimeConfigFieldState,
  copy: AdminModuleRuntimeConfigBuildFormCopy
) {
  if (field.source === 'env') {
    return copy.overriddenByEnv;
  }

  if (field.source === 'db') {
    return field.placeholder ?? copy.dbFallbackValue;
  }

  return field.placeholder ?? field.defaultValue ?? copy.dbFallbackValue;
}

function createModuleRuntimeConfigField({
  field,
  copy
}: {
  field: AdminModuleRuntimeConfigFieldState;
  copy: AdminModuleRuntimeConfigBuildFormCopy;
}) {
  const description = formatConfigMetaDescription({
    base: field.description?.trim() || field.label,
    envKey: field.envKey?.trim() || 'n/a',
    source: field.source,
    copy
  });
  const placeholder = resolveFieldPlaceholder(field, copy);

  if (field.kind === 'boolean') {
    return buildFormField.checkbox({
      name: field.formFieldName,
      label: field.label,
      description,
      defaultValue: field.dbValue || field.value || 'false',
      uncheckedValue: 'false'
    });
  }

  if (field.kind === 'number') {
    return buildFormField.number({
      name: field.formFieldName,
      label: field.label,
      description,
      defaultValue: field.dbValue,
      placeholder,
      step: 'any',
      inputMode: 'decimal'
    });
  }

  if (field.kind === 'textarea') {
    return buildFormField.textarea({
      name: field.formFieldName,
      label: field.label,
      description,
      defaultValue: field.dbValue,
      placeholder,
      rows: 4
    });
  }

  if (field.kind === 'select') {
    return buildFormField.select({
      name: field.formFieldName,
      label: field.label,
      description,
      defaultValue: field.dbValue || field.value || field.defaultValue || '',
      options: (field.options ?? []).map((option) => ({
        value: option.value,
        label: option.label
      }))
    });
  }

  if (field.kind === 'password') {
    return buildFormField.password({
      name: field.formFieldName,
      label: field.label,
      description,
      defaultValue: field.dbValue,
      placeholder
    });
  }

  return buildFormField.text({
    name: field.formFieldName,
    label: field.label,
    description,
    defaultValue: field.dbValue,
    placeholder
  });
}

export function createAdminModuleRuntimeConfigForm({
  module,
  messages
}: {
  module: AdminAppConfigModuleItem;
  messages: AdminMessages;
}): BuildFormDefinition | null {
  if (module.configFields.length === 0) {
    return null;
  }

  const copy: AdminModuleRuntimeConfigBuildFormCopy = {
    envPrefix: messages.appConfig.envPrefix,
    sourcePrefix: messages.appConfig.sourcePrefix,
    overriddenByEnv: messages.appConfig.overriddenByEnv,
    dbFallbackValue: messages.appConfig.dbFallbackValue,
    save: messages.appConfig.modules.save,
    saving: messages.appConfig.modules.saving
  };

  return composeBuildFormDefinition(
    defineBuildForm({
      id: `admin-app-config-module-form-${module.moduleId.replace(/[^a-z0-9_-]+/gi, '-')}`,
      layout: {
        columns: 1
      },
      fields: [
        buildFormField.hidden({
          name: 'moduleId',
          defaultValue: module.moduleId
        }),
        ...module.configFields.map((field) =>
          createModuleRuntimeConfigField({
            field,
            copy
          })
        )
      ]
    }),
    {
      request: {
        action: upsertModuleRuntimeConfigAction,
        method: 'post'
      },
      submit: {
        idleLabel: copy.save,
        pendingLabel: copy.saving,
        align: 'end',
        size: 'sm',
        variant: 'outline'
      }
    }
  );
}
