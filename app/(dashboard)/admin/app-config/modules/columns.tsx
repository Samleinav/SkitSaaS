'use client';

import Link from 'next/link';
import {
  buildTableColumn,
  defineBuildTable,
  type BuildTableDefinition
} from '@skitsaas/sdk/datatables';
import type { AdminMessages } from '@/lib/i18n/messages/admin';
import type { AdminAppConfigModuleItem } from './config';

function getDbStatusLabel(
  module: AdminAppConfigModuleItem,
  messages: AdminMessages
) {
  const labels = messages.appConfig.modules;

  if (module.dbStatus === 'enabled') {
    return labels.enabled;
  }

  if (module.dbStatus === 'disabled') {
    return labels.disabled;
  }

  if (module.dbStatus === 'installed') {
    return labels.installed;
  }

  return labels.uninstalled;
}

function getRuntimeFieldsLabel(
  module: AdminAppConfigModuleItem,
  messages: AdminMessages
) {
  const labels = messages.appConfig.modules;

  if (module.configFieldCount <= 0) {
    return labels.noRuntimeFields;
  }

  if (module.configFieldCount === 1) {
    return labels.oneRuntimeField;
  }

  return labels.multipleRuntimeFields.replace(
    '{count}',
    String(module.configFieldCount)
  );
}

function renderStatusPill({
  label,
  tone
}: {
  label: string;
  tone: 'success' | 'warning' | 'muted';
}) {
  const className =
    tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : tone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'border-border bg-muted text-muted-foreground';

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export function getModulesTableDefinition({
  data,
  messages
}: {
  data: AdminAppConfigModuleItem[];
  messages: AdminMessages;
}): BuildTableDefinition<AdminAppConfigModuleItem> {
  const table = messages.appConfig.modules.table;
  const labels = messages.appConfig.modules;

  const definition: BuildTableDefinition<AdminAppConfigModuleItem> = {
    data,
    columns: [
      buildTableColumn.text<AdminAppConfigModuleItem>({
        key: 'displayName',
        header: table.module,
        sortable: true,
        searchable: true,
        cell: (row) => (
          <div className="min-w-[280px]">
            <p className="font-medium text-foreground">{row.displayName}</p>
            <p className="text-xs text-muted-foreground">{row.moduleId}</p>
            {row.description ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {row.description}
              </p>
            ) : null}
          </div>
        )
      }),
      buildTableColumn.text<AdminAppConfigModuleItem>({
        key: 'dbStatus',
        header: table.dbStatus,
        sortable: true,
        cell: (row) =>
          renderStatusPill({
            label: getDbStatusLabel(row, messages),
            tone:
              row.dbStatus === 'enabled'
                ? 'success'
                : row.dbStatus === 'disabled'
                  ? 'warning'
                  : 'muted'
          })
      }),
      buildTableColumn.text<AdminAppConfigModuleItem>({
        key: 'effectiveEnabled',
        header: table.effectiveStatus,
        sortable: true,
        cell: (row) => (
          <div className="space-y-1">
            {renderStatusPill({
              label: row.effectiveEnabled ? labels.enabled : labels.disabled,
              tone: row.effectiveEnabled ? 'success' : 'warning'
            })}
            {row.configOverrideValue === true ? (
              <p className="text-xs text-muted-foreground">
                {labels.overrideEnabled}
              </p>
            ) : null}
            {row.configOverrideValue === false ? (
              <p className="text-xs text-muted-foreground">
                {labels.overrideDisabled}
              </p>
            ) : null}
          </div>
        )
      }),
      buildTableColumn.text<AdminAppConfigModuleItem>({
        key: 'installMode',
        header: table.installMode,
        sortable: true,
        cell: (row) => (
          <span className="text-sm capitalize text-muted-foreground">
            {row.installMode}
          </span>
        )
      }),
      buildTableColumn.text<AdminAppConfigModuleItem>({
        key: 'configFieldCount',
        header: table.runtimeFields,
        sortable: true,
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {getRuntimeFieldsLabel(row, messages)}
          </span>
        )
      }),
      buildTableColumn.custom<AdminAppConfigModuleItem>({
        key: 'actions',
        header: table.actions,
        cell: (row) => (
          <Link
            href={`/admin/app-config/modules#${row.anchorId}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {labels.manage}
          </Link>
        )
      })
    ]
  };

  return defineBuildTable<
    AdminAppConfigModuleItem,
    BuildTableDefinition<AdminAppConfigModuleItem>
  >(definition);
}
