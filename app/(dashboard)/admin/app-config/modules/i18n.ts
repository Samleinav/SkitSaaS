import type { DataTableLabels } from '@/components/ui/data-table';
import type { Translator } from '@/lib/i18n/translator';

export type AdminAppConfigModulesCopy = {
  title: string;
  description: string;
  inventoryTitle: string;
  inventoryDescription: string;
  runtimeModeLabel: string;
  runtimeModeDescription: string;
  runtimeModes: {
    db: string;
    hybrid: string;
    config: string;
  };
  table: {
    module: string;
    dbStatus: string;
    effectiveStatus: string;
    installMode: string;
    runtimeFields: string;
    actions: string;
  };
  versionLabel: string;
  manage: string;
  save: string;
  saving: string;
  enable: string;
  enabling: string;
  disable: string;
  disabling: string;
  enabled: string;
  disabled: string;
  installed: string;
  uninstalled: string;
  toggleTitle: string;
  toggleDescription: string;
  toggleLockedConfigMode: string;
  toggleLockedOverride: string;
  configTitle: string;
  configDescription: string;
  noConfigTitle: string;
  noConfigDescription: string;
  noRuntimeFields: string;
  oneRuntimeField: string;
  multipleRuntimeFields: string;
  overrideEnabled: string;
  overrideDisabled: string;
  envPriority: string;
  envPrefix: string;
  overriddenByEnv: string;
  dbFallbackValue: string;
  sourcePrefix: string;
  dataTable: DataTableLabels;
};

export function createAdminAppConfigModulesCopy(
  t: Translator
): AdminAppConfigModulesCopy {
  return {
    title: t('Modules'),
    description: t(
      'Review module runtime state, edit manifest-defined DB fallback values, and use the DB emergency switch when allowed.'
    ),
    inventoryTitle: t('Module inventory'),
    inventoryDescription: t(
      'Effective runtime status depends on module runtime mode plus any app.config/env overrides.'
    ),
    runtimeModeLabel: t('Runtime mode'),
    runtimeModeDescription: t(
      'DB mode uses app_modules state. Hybrid merges DB with app.config/env overrides. Config mode ignores DB status.'
    ),
    runtimeModes: {
      db: t('DB'),
      hybrid: t('Hybrid'),
      config: t('Config')
    },
    table: {
      module: t('Module'),
      dbStatus: t('DB status'),
      effectiveStatus: t('Effective status'),
      installMode: t('Install mode'),
      runtimeFields: t('Runtime fields'),
      actions: t('Actions')
    },
    versionLabel: t('Version'),
    manage: t('Manage'),
    save: t('Save module config'),
    saving: t('Saving module config...'),
    enable: t('Enable'),
    enabling: t('Enabling...'),
    disable: t('Disable'),
    disabling: t('Disabling...'),
    enabled: t('Enabled'),
    disabled: t('Disabled'),
    installed: t('Installed'),
    uninstalled: t('Uninstalled'),
    toggleTitle: t('Runtime status'),
    toggleDescription: t(
      'Use this as an emergency switch when DB status participates in runtime resolution.'
    ),
    toggleLockedConfigMode: t(
      'This installation is running in config mode. DB status does not control the effective module state.'
    ),
    toggleLockedOverride: t(
      'This module is explicitly overridden by app.config/env. Remove that override to use the DB emergency switch.'
    ),
    configTitle: t('Runtime config'),
    configDescription: t(
      'Editable fallback values declared by the module manifest. Environment values still have priority.'
    ),
    noConfigTitle: t('No editable runtime config'),
    noConfigDescription: t(
      'This module does not declare runtime fields for BuildForm rendering.'
    ),
    noRuntimeFields: t('No runtime fields'),
    oneRuntimeField: t('1 field'),
    multipleRuntimeFields: t('{count} fields'),
    overrideEnabled: t('Forced enabled by app.config/env'),
    overrideDisabled: t('Forced disabled by app.config/env'),
    envPriority: t(
      'Environment values have priority. DB values are used only when env is empty.'
    ),
    envPrefix: t('ENV'),
    overriddenByEnv: t('Overridden by env'),
    dbFallbackValue: t('DB fallback value'),
    sourcePrefix: t('Value source'),
    dataTable: {
      filterPlaceholder: t('Filter...'),
      columns: t('Columns'),
      noResults: t('No results.'),
      showingRows: t('Showing {shown} of {filtered} row(s).'),
      previous: t('Previous'),
      next: t('Next')
    }
  };
}
