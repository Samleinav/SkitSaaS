import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import {
  getCheckoutCallbackAttemptsForAdmin,
  getEmailLogsForAdmin,
  getSystemActivityLogsForAdmin
} from '@/lib/db/queries.admin';
import { getRequestLocale, getServerTranslator } from '@/lib/i18n/server';
import { getDateLocale } from '@/lib/i18n/formatting';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';
import { requireAdminAccess } from '../guards';
import { getCheckoutCallbackOutcome } from '../payments/callback-attempts';
import { formatDateTime } from '../utils';
import { AdminCheckoutLogsDataTable } from './checkout-logs-data-table';
import {
  type AdminCheckoutLogRow,
  type AdminCheckoutLogOrderType,
  type AdminCheckoutLogOwnerType
} from './checkout-log-columns';
import { AdminLogsDataTable } from './logs-data-table';
import type { AdminSystemLogRow } from './log-columns';
import { createAdminLogsCopy, type AdminLogsCopy } from './i18n';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type AdminLogTab = 'system' | 'checkout' | 'email';

function resolveLogTab(value: string | string[] | undefined): AdminLogTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'email') {
    return 'email';
  }

  if (raw === 'checkout') {
    return 'checkout';
  }

  return 'system';
}

function getLogTabHref(tab: AdminLogTab) {
  return tab === 'system' ? '/admin/logs' : `/admin/logs?tab=${tab}`;
}

function formatActorLabel(
  {
    actorEmail,
    actorUserId,
    actorRole
  }: {
    actorEmail: string | null;
    actorUserId: number | null;
    actorRole: string | null;
  },
  copy: AdminLogsCopy['table']
) {
  const actorBase =
    actorEmail || (actorUserId ? `user:${actorUserId}` : copy.noActor);

  if (!actorRole) {
    return actorBase;
  }

  return `${actorBase} (${actorRole})`;
}

function formatEntityLabel(
  {
    entityType,
    entityId
  }: {
    entityType: string | null;
    entityId: string | null;
  },
  copy: AdminLogsCopy['table']
) {
  if (!entityType && !entityId) {
    return copy.noEntity;
  }

  if (!entityType) {
    return entityId || copy.noEntity;
  }

  if (!entityId) {
    return entityType;
  }

  return `${entityType}:${entityId}`;
}

function formatMessage({
  message,
  metadata
}: {
  message: string | null;
  metadata: string | null;
}) {
  if (message && metadata) {
    return `${message} | ${metadata}`;
  }

  return message || metadata || '-';
}

function getEmailStatusClassName(status: string) {
  if (status === 'sent') {
    return 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300';
  }

  if (status === 'failed') {
    return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
  }

  if (status === 'skipped') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }

  return 'border-border bg-muted text-muted-foreground';
}

function truncateText(value: string | null, maxLength: number) {
  if (!value) {
    return '-';
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function normalizeCheckoutLogOrderType(
  value: string | null
): AdminCheckoutLogOrderType {
  if (value === 'subscription' || value === 'one_time') {
    return value;
  }

  return 'unknown';
}

function normalizeCheckoutLogOwnerType(
  value: string | null
): AdminCheckoutLogOwnerType {
  if (value === 'core' || value === 'module') {
    return value;
  }

  return 'unknown';
}

function formatCheckoutLogOwnerLabel(
  {
    ownerType,
    moduleId
  }: {
    ownerType: string | null;
    moduleId: string | null;
  },
  copy: AdminLogsCopy['checkout']['table']
) {
  const normalizedOwnerType = normalizeCheckoutLogOwnerType(ownerType);

  if (normalizedOwnerType === 'module') {
    return moduleId ? `${copy.ownerModule}:${moduleId}` : copy.ownerModule;
  }

  if (normalizedOwnerType === 'core') {
    return copy.ownerCore;
  }

  return copy.ownerUnknown;
}

function formatCheckoutLogTargetLabel(
  {
    targetType,
    targetTeamId,
    targetUserId,
    teamId,
    teamName
  }: {
    targetType: string | null;
    targetTeamId: number | null;
    targetUserId: number | null;
    teamId: number | null;
    teamName: string | null;
  },
  copy: AdminLogsCopy['checkout']['table']
) {
  if (targetType === 'team') {
    return teamName || (targetTeamId ? `team:${targetTeamId}` : copy.unknownTarget);
  }

  if (targetType === 'user') {
    return targetUserId ? `user:${targetUserId}` : copy.unknownTarget;
  }

  return teamName || (teamId ? `team:${teamId}` : copy.unknownTarget);
}

function formatCheckoutProviderIdsLabel(
  {
    providerReferenceId,
    providerSessionId,
    externalPaymentId,
    externalOrderId
  }: {
    providerReferenceId: string | null;
    providerSessionId: string | null;
    externalPaymentId: string | null;
    externalOrderId: string | null;
  },
  copy: AdminLogsCopy['checkout']['table']
) {
  const ids = [
    providerReferenceId,
    providerSessionId,
    externalPaymentId,
    externalOrderId
  ].filter((value): value is string => Boolean(value));

  return ids.length ? ids.join(' / ') : copy.none;
}

function formatCheckoutMessage({
  message,
  metadata
}: {
  message: string | null;
  metadata: string | null;
}) {
  if (message) {
    return message;
  }

  return truncateText(metadata, 180);
}

export default async function AdminLogsPage({ searchParams }: PageProps) {
  const [locale, t] = await Promise.all([
    getRequestLocale(),
    getServerTranslator({ area: 'admin' })
  ]);
  const copy = createAdminLogsCopy(t);
  const logsPage = copy;
  const emailMessages = copy.email;
  const dateLocale = getDateLocale(locale);
  const resolvedSearchParams = await searchParams;
  const selectedTab = resolveLogTab(resolvedSearchParams.tab);

  await requireAdminAccess();

  let rows: AdminSystemLogRow[] = [];
  let checkoutRows: AdminCheckoutLogRow[] = [];
  let emailLogs: Awaited<ReturnType<typeof getEmailLogsForAdmin>> = [];

  if (selectedTab === 'system') {
    const logs = await getSystemActivityLogsForAdmin(500);
    rows = logs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt.getTime(),
      createdAtLabel: formatDateTime(log.createdAt, dateLocale),
      eventType: log.eventType,
      eventCategory: log.eventCategory,
      action: log.action,
      status: log.status,
      actorLabel: formatActorLabel(log, logsPage.table),
      targetLabel: log.targetUserId
        ? `user:${log.targetUserId}`
        : logsPage.table.noTarget,
      teamLabel:
        log.teamName ||
        (log.teamId ? `team:${log.teamId}` : logsPage.table.noTeam),
      entityLabel: formatEntityLabel(log, logsPage.table),
      sourceLabel: log.source || logsPage.table.noSource,
      requestId: log.requestId || '-',
      ipAddress: log.ipAddress || '-',
      message: formatMessage(log)
    }));
  } else if (selectedTab === 'checkout') {
    const checkoutLogs = await getCheckoutCallbackAttemptsForAdmin(500);
    checkoutRows = checkoutLogs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt.getTime(),
      createdAtLabel: formatDateTime(log.createdAt, dateLocale),
      eventType: log.eventType,
      outcome: getCheckoutCallbackOutcome(log.eventType),
      paymentMethodId: log.paymentMethodId,
      provider: log.provider,
      orderType: normalizeCheckoutLogOrderType(log.orderType),
      ownerType: normalizeCheckoutLogOwnerType(log.ownerType),
      ownerLabel: formatCheckoutLogOwnerLabel(log, copy.checkout.table),
      targetLabel: formatCheckoutLogTargetLabel(log, copy.checkout.table),
      source: log.source || copy.checkout.table.none,
      checkoutLabel:
        log.checkoutToken ||
        (log.checkoutOrderId ? `#${log.checkoutOrderId}` : copy.checkout.table.none),
      providerIdsLabel: formatCheckoutProviderIdsLabel(
        log,
        copy.checkout.table
      ),
      message: formatCheckoutMessage(log)
    }));
  } else {
    emailLogs = await getEmailLogsForAdmin(500);
  }

  const emailStatusLabels: Record<string, string> = {
    queued: emailMessages.status.queued,
    sent: emailMessages.status.sent,
    failed: emailMessages.status.failed,
    skipped: emailMessages.status.skipped
  };
  const themeSelection = await getThemeSelectionForArea('admin');

  const fallbackPage = (
    <Card>
      <CardHeader className="space-y-4">
        <CardTitle>{logsPage.title}</CardTitle>
        <CardDescription>{logsPage.description}</CardDescription>
        <div className="inline-flex w-fit items-center rounded-xl border border-border/80 bg-background/70 p-1">
          <Button
            asChild
            size="sm"
            variant={selectedTab === 'system' ? 'default' : 'ghost'}
            className="rounded-lg"
          >
            <Link href={getLogTabHref('system')}>{logsPage.tabs.system}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant={selectedTab === 'checkout' ? 'default' : 'ghost'}
            className="rounded-lg"
          >
            <Link href={getLogTabHref('checkout')}>{logsPage.tabs.checkout}</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant={selectedTab === 'email' ? 'default' : 'ghost'}
            className="rounded-lg"
          >
            <Link href={getLogTabHref('email')}>{logsPage.tabs.email}</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selectedTab === 'system' ? (
          <AdminLogsDataTable
            data={rows}
            copy={copy}
            tableTemplate={{
              componentId: 'ui.table',
              area: 'admin',
            }}
          />
        ) : selectedTab === 'checkout' ? (
          <AdminCheckoutLogsDataTable
            data={checkoutRows}
            copy={copy}
            tableTemplate={{
              componentId: 'ui.table',
              area: 'admin',
            }}
          />
        ) : emailLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emailMessages.logsEmpty}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[1300px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">
                    {emailMessages.logsHeaders.created}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {emailMessages.logsHeaders.status}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {emailMessages.logsHeaders.event}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {emailMessages.logsHeaders.recipient}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {emailMessages.logsHeaders.subject}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {emailMessages.logsHeaders.source}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {emailMessages.logsHeaders.message}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {emailMessages.logsHeaders.details}
                  </th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.map((log) => (
                  <tr key={log.id} className="border-b align-top last:border-b-0">
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt, dateLocale)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getEmailStatusClassName(log.status)}`}
                      >
                        {emailStatusLabels[log.status] || log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {log.eventType}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {log.recipientEmail}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {log.subject || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {log.source || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {log.message || '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {truncateText(log.metadata, 180)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!themeSelection?.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.admin.logs"
      data={{
        title: logsPage.title,
        description: logsPage.description,
        tab: selectedTab
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
