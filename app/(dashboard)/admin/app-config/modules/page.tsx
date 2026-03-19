import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { AsyncSubmitButton } from '@/components/ui/async-submit-button';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { TemplateBuildForm } from '@/components/ui/template-build-form';
import { getServerTranslator } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { setModuleRuntimeStatusAction } from './actions';
import { getAdminAppConfigModulesData } from './config';
import { createAdminModuleRuntimeConfigForm } from './forms';
import { createAdminAppConfigModulesCopy } from './i18n';
import { AdminAppConfigModulesDataTable } from './modules-data-table';

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

export default async function AdminAppConfigModulesPage() {
  const t = await getServerTranslator({ area: 'admin' });
  const themeSelection = await getThemeSelectionForArea('admin');
  const { moduleRuntimeMode, modules } = await getAdminAppConfigModulesData();
  const modulesCopy = createAdminAppConfigModulesCopy(t);
  const runtimeModeLabel = modulesCopy.runtimeModes[moduleRuntimeMode];

  const fallbackPage = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{modulesCopy.title}</CardTitle>
          <CardDescription>{modulesCopy.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              {modulesCopy.runtimeModeLabel}:
            </span>{' '}
            {runtimeModeLabel}
          </p>
          <p>{modulesCopy.runtimeModeDescription}</p>
          <p>{modulesCopy.envPriority}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{modulesCopy.inventoryTitle}</CardTitle>
          <CardDescription>{modulesCopy.inventoryDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAppConfigModulesDataTable
            data={modules}
            copy={modulesCopy}
          />
        </CardContent>
      </Card>

      {modules.map((module) => {
        const runtimeConfigForm = createAdminModuleRuntimeConfigForm({
          module,
          copy: modulesCopy
        });
        const dbStatusLabel =
          module.dbStatus === 'enabled'
            ? modulesCopy.enabled
            : module.dbStatus === 'disabled'
              ? modulesCopy.disabled
              : module.dbStatus === 'installed'
                ? modulesCopy.installed
                : modulesCopy.uninstalled;

        return (
          <Card key={module.moduleId} id={module.anchorId} className="scroll-mt-24">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <CardTitle>{module.displayName}</CardTitle>
                  <CardDescription>
                    {module.description || module.moduleId}
                  </CardDescription>
                  {module.description ? (
                    <p className="text-xs text-muted-foreground">{module.moduleId}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {renderStatusPill({
                    label: dbStatusLabel,
                    tone:
                      module.dbStatus === 'enabled'
                        ? 'success'
                        : module.dbStatus === 'disabled'
                          ? 'warning'
                          : 'muted'
                  })}
                  {renderStatusPill({
                    label: module.effectiveEnabled
                      ? modulesCopy.enabled
                      : modulesCopy.disabled,
                    tone: module.effectiveEnabled ? 'success' : 'warning'
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {modulesCopy.toggleTitle}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {modulesCopy.toggleDescription}
                  </p>
                  {module.configOverrideValue === true ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {modulesCopy.overrideEnabled}
                    </p>
                  ) : null}
                  {module.configOverrideValue === false ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {modulesCopy.overrideDisabled}
                    </p>
                  ) : null}
                  <form action={setModuleRuntimeStatusAction} className="mt-4">
                    <input type="hidden" name="moduleId" value={module.moduleId} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={module.dbStatus === 'enabled' ? 'false' : 'true'}
                    />
                    <AsyncSubmitButton
                      idleLabel={
                        module.dbStatus === 'enabled'
                          ? modulesCopy.disable
                          : modulesCopy.enable
                      }
                      pendingLabel={
                        module.dbStatus === 'enabled'
                          ? modulesCopy.disabling
                          : modulesCopy.enabling
                      }
                      successLabel={
                        module.dbStatus === 'enabled'
                          ? modulesCopy.disabled
                          : modulesCopy.enabled
                      }
                      size="sm"
                      variant={
                        module.dbStatus === 'enabled' ? 'destructive' : 'outline'
                      }
                      disabled={module.toggleLocked}
                    />
                  </form>
                  {module.toggleLockReason === 'runtime_mode_config' ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {modulesCopy.toggleLockedConfigMode}
                    </p>
                  ) : null}
                  {module.toggleLockReason === 'config_override' ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {modulesCopy.toggleLockedOverride}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-xl border border-border/70 bg-background/70 p-4 text-xs text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">
                      {modulesCopy.versionLabel}:
                    </span>{' '}
                    {module.runtimeVersion}
                  </p>
                  <p className="mt-2">
                    <span className="font-medium text-foreground">
                      {modulesCopy.table.installMode}:
                    </span>{' '}
                    <span className="capitalize">{module.installMode}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    {module.configFieldCount > 0
                      ? module.runtimeConfigTitle || modulesCopy.configTitle
                      : modulesCopy.noConfigTitle}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {module.configFieldCount > 0
                      ? module.runtimeConfigDescription || modulesCopy.configDescription
                      : modulesCopy.noConfigDescription}
                  </p>
                </div>

                {runtimeConfigForm ? (
                  <TemplateBuildForm
                    definition={runtimeConfigForm}
                    area="admin"
                    route="/admin/app-config/modules"
                    slot="admin.app-config.modules"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {modulesCopy.noConfigDescription}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.app-config.modules"
      data={{
        title: modulesCopy.title,
        description: modulesCopy.description,
        runtimeMode: moduleRuntimeMode
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
