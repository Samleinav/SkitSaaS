import { Card, CardContent } from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import {
  getAdminDashboardSummary,
  getSystemActivityLogsForAdmin
} from '@/lib/db/queries';
import { getServerLocaleAndMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { getEnabledAdminDashboardModules } from './admin-dashboard/modules';
import type { AdminDashboardModuleProps } from './admin-dashboard/types';
import { requireAdminAccess } from './guards';

const RECENT_ACTIVITY_LIMIT = 4;
const ADMIN_DASHBOARD_FALLBACK_MODULE_TEMPLATE_ID =
  'section.admin.dashboard.module-widget';
const ADMIN_DASHBOARD_MODULE_TEMPLATE_ID_BY_MODULE: Partial<
  Record<string, string>
> = {
  overview: 'section.admin.dashboard.overview',
  quickLinks: 'section.admin.dashboard.quick-links',
  recentActivity: 'section.admin.dashboard.recent-activity'
};

export default async function AdminPage() {
  await requireAdminAccess();

  const { locale, messages } = await getServerLocaleAndMessages('admin');
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US';

  const [summary, activityLogs] = await Promise.all([
    getAdminDashboardSummary(),
    getSystemActivityLogsForAdmin(120)
  ]);

  const moduleProps = {
    messages,
    dateLocale,
    summary,
    recentActivity: activityLogs.slice(0, RECENT_ACTIVITY_LIMIT).map((activityLog) => ({
      id: activityLog.id,
      eventType: activityLog.eventType,
      status: activityLog.status,
      message: activityLog.message,
      createdAt: activityLog.createdAt
    })),
    activityChart: []
  } satisfies AdminDashboardModuleProps;

  const enabledModules = await getEnabledAdminDashboardModules();
  const themeSelection = await getThemeSelectionForArea('admin');
  const renderedModules = enabledModules.map((moduleItem, moduleIndex) => {
    const fallbackModule = <moduleItem.Component key={moduleItem.id} {...moduleProps} />;
    const hasCoreTemplate = Object.prototype.hasOwnProperty.call(
      ADMIN_DASHBOARD_MODULE_TEMPLATE_ID_BY_MODULE,
      moduleItem.id
    );
    const templateId =
      ADMIN_DASHBOARD_MODULE_TEMPLATE_ID_BY_MODULE[moduleItem.id] ??
      ADMIN_DASHBOARD_FALLBACK_MODULE_TEMPLATE_ID;
    const moduleTemplateKind = hasCoreTemplate ? 'core' : 'module';

    if (!themeSelection.themeKey) {
      return fallbackModule;
    }

    return (
      <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
        key={moduleItem.id}
        id={templateId}
        data={{
          title: messages.layout.title,
          moduleWidgetId: moduleItem.id,
          moduleWidgetIndex: moduleIndex,
          moduleWidgetKind: moduleTemplateKind
        }}
        fallback={fallbackModule}
      >
        {fallbackModule}
      </ThemeCodeTemplate>
    );
  });

  const fallbackPage = (
    <div className="space-y-6">
      {enabledModules.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">{messages.dataTable.noResults}</p>
          </CardContent>
        </Card>
      ) : (
        renderedModules
      )}
    </div>
  );

  if (!themeSelection.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.home"
      data={{
        title: messages.layout.title
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
