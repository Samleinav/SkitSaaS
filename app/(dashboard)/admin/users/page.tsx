import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import {
  getAllUsersForAdmin,
  getUserSubscriptionTemplatesForAdmin
} from '@/lib/db/queries';
import { requireAdminAccess } from '../guards';
import { formatDate } from '../utils';
import type { AdminUserRow } from './columns';
import { AdminUsersDataTable } from './users-data-table';
import { getServerLocaleAndMessages } from '@/lib/i18n/server';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { AdminCreateUserDialog } from './create-user-dialog';
import { resolveAdminUserDisplayStatus } from './status';

export default async function AdminUsersPage() {
  return <AdminUsersTable />;
}

type MetricCardProps = {
  label: string;
  value: number;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

async function AdminUsersTable() {
  const { locale, messages } = await getServerLocaleAndMessages('admin');
  const dateLocale = locale === 'es' ? 'es-ES' : 'en-US';
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
      <MetricCard
        label={messages.usersTable.statusActive}
        value={activeUsersCount}
      />
      <MetricCard
        label={messages.usersTable.statusSuspended}
        value={suspendedUsersCount}
      />
      <MetricCard
        label={messages.usersTable.statusBanned}
        value={bannedUsersCount}
      />
    </div>
  );
  const metricsSlot = themeSelection?.themeKey ? (
    <ThemeCodeTemplate
      id="section.admin.metrics-grid"
      themeId={themeSelection.themeKey}
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
    <div className="space-y-6">
      {metricsSlot}

      <Card>
        <CardHeader>
          <CardTitle>{messages.usersPage.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminUsersDataTable
            data={data}
            messages={messages}
            tableTemplate={{
              componentId: 'ui.table',
              area: 'admin',
            }}
            toolbarActions={
              <AdminCreateUserDialog
                messages={messages}
                userTemplateOptions={userTemplateOptions}
                locale={dateLocale}
                themeId={themeSelection?.themeKey ?? null}
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      id="page.admin.users"
      themeId={themeSelection.themeKey}
      data={{
        title: messages.usersPage.title
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}

