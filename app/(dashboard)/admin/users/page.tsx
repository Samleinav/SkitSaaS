import {
  AdminMetricCard,
  AdminPageShell
} from '../admin-page-shell';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import {
  getAllUsersForAdmin,
  getUserSubscriptionTemplatesForAdmin
} from '@/lib/db/queries.admin';
import { requireAdminAccess } from '../guards';
import { formatDate } from '../utils';
import type { AdminUserRow } from './columns';
import { AdminUsersDataTable } from './users-data-table';
import { getRequestLocale, getServerTranslator } from '@/lib/i18n/server';
import { getDateLocale } from '@/lib/i18n/formatting';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { AdminCreateUserDialog } from './create-user-dialog';
import { resolveAdminUserDisplayStatus } from './status';
import { createAdminUsersCopy } from './i18n';

export default async function AdminUsersPage() {
  return <AdminUsersTable />;
}

async function AdminUsersTable() {
  const [locale, t] = await Promise.all([
    getRequestLocale(),
    getServerTranslator({ area: 'admin' })
  ]);
  const dateLocale = getDateLocale(locale);
  const copy = createAdminUsersCopy(t);
  await requireAdminAccess();

  const [allUsers, userTemplateOptions] = await Promise.all([
    getAllUsersForAdmin(),
    getUserSubscriptionTemplatesForAdmin()
  ]);

  const data: AdminUserRow[] = allUsers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: resolveAdminUserDisplayStatus({
      deletedAt: user.deletedAt,
      accountStatus: user.accountStatus
    }),
    statusReason: user.statusReason,
    organizationsCount: user.organizationsCount,
    ownedOrganizationsCount: user.ownedOrganizationsCount,
    subscriptionTemplateName: user.subscriptionTemplateName,
    createdAt: user.createdAt.getTime(),
    createdAtLabel: formatDate(user.createdAt, dateLocale)
  }));

  const activeUsersCount = data.filter((user) => user.status === 'active').length;
  const suspendedUsersCount = data.filter(
    (user) => user.status === 'suspended'
  ).length;
  const bannedUsersCount = data.filter((user) => user.status === 'banned').length;
  const themeSelection = await getThemeSelectionForArea('admin');
  const metricsFallback = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AdminMetricCard
        label={copy.usersTable.statusActive}
        value={activeUsersCount}
      />
      <AdminMetricCard
        label={copy.usersTable.statusSuspended}
        value={suspendedUsersCount}
      />
      <AdminMetricCard
        label={copy.usersTable.statusBanned}
        value={bannedUsersCount}
      />
    </div>
  );
  const metricsSlot = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="section.admin.metrics-grid"
      data={{
        variant: 'users',
        columns: 3
      }}
      fallback={metricsFallback}
    >
      {metricsFallback}
    </ThemeCodeTemplate>
  ) : (
    metricsFallback
  );

  const fallbackPage = (
    <AdminPageShell
      title={copy.title}
      description={copy.description}
      actions={
        <AdminCreateUserDialog
          copy={copy}
          userTemplateOptions={userTemplateOptions}
          locale={dateLocale}
          themeId={themeSelection.themeKey}
        />
      }
      metrics={metricsSlot}
    >
      <AdminUsersDataTable
        data={data}
        copy={copy}
        tableTemplate={{
          componentId: 'ui.table',
          area: 'admin',
        }}
      />
    </AdminPageShell>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.users"
      data={{
        title: copy.title,
        description: copy.description
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
