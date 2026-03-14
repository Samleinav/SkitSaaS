import Link from 'next/link';
import { requireAdmin } from '@skitsaas/sdk/server';
import { getServerTranslator } from '@/lib/i18n/server';
import { formatScientistDate, formatScientistUsd, SCIENTIST_MODULE_NAME } from '../constants';
import {
  getScientistAdminOverview,
  getScientistAdminUsageSummary,
  listScientistRunsForAdmin,
} from '../data';
import { ScientistAdminRoutes } from '../routes';
import {
  ScientistKeyValueList,
  ScientistModuleShell,
  ScientistPanel,
} from '../components/module-shell';
import { ScientistStatusBadge } from '../components/status-badge';

type ScientistAdminUser = {
  id: number;
  role?: string | null;
};

function renderActionLink(href: string, label: string) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

export async function renderScientistAdminHomePage() {
  await requireAdmin<ScientistAdminUser>();
  const t = await getServerTranslator();
  const overview = await getScientistAdminOverview();

  return (
    <ScientistModuleShell
      eyebrow={SCIENTIST_MODULE_NAME}
      title={t('AI Scientist')}
      description={t('Admin overview for module usage, recent runs, and run pipeline health.')}
      actions={
        <>
          {renderActionLink(String(ScientistAdminRoutes.runs), t('Admin runs'))}
          {renderActionLink(String(ScientistAdminRoutes.usage), t('Admin usage'))}
        </>
      }
    >
      <ScientistPanel title={t('Overview')}>
        <ScientistKeyValueList
          items={[
            { label: t('Total sessions'), value: overview.totalSessions },
            { label: t('Total runs'), value: overview.totalRuns },
            { label: t('Total cost'), value: formatScientistUsd(overview.totalCostUsd) },
            { label: t('Recent runs'), value: overview.recentRuns.length },
          ]}
        />
      </ScientistPanel>

      <ScientistPanel title={t('Recent runs')}>
        {overview.recentRuns.length === 0 ? (
          <p className="text-sm text-slate-600">{t('No runs yet.')}</p>
        ) : (
          <div className="grid gap-3">
            {overview.recentRuns.map((run) => (
              <div key={run.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <ScientistStatusBadge status={run.status} />
                      <span className="text-sm text-slate-600">{run.tier}</span>
                    </div>
                    <p className="text-sm text-slate-900">{run.rawQuery}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatScientistDate(run.queuedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScientistPanel>
    </ScientistModuleShell>
  );
}

export async function renderScientistAdminRunsPage(filters?: {
  status?: string | null;
  tier?: string | null;
}) {
  await requireAdmin<ScientistAdminUser>();
  const t = await getServerTranslator();
  const runs = await listScientistRunsForAdmin(filters);

  return (
    <ScientistModuleShell
      eyebrow={SCIENTIST_MODULE_NAME}
      title={t('Admin runs')}
      description={t('Inspect run status, user ownership, and the current backlog.')}
      actions={renderActionLink(String(ScientistAdminRoutes.home), t('Back to hub'))}
    >
      <ScientistPanel title={t('Admin runs')}>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-600">{t('No runs yet.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">{t('User')}</th>
                  <th className="px-2 py-2">{t('Status')}</th>
                  <th className="px-2 py-2">{t('Tier')}</th>
                  <th className="px-2 py-2">{t('Cost')}</th>
                  <th className="px-2 py-2">{t('Created at')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-slate-100">
                    <td className="px-2 py-3">
                      <div className="font-medium text-slate-900">
                        {run.userEmail || `user#${run.userId}`}
                      </div>
                      <div className="text-xs text-slate-500">{run.sessionTitle}</div>
                    </td>
                    <td className="px-2 py-3">
                      <ScientistStatusBadge status={run.status} />
                    </td>
                    <td className="px-2 py-3 text-slate-600">{run.tier}</td>
                    <td className="px-2 py-3 text-slate-600">
                      {formatScientistUsd(run.costUsdTotal)}
                    </td>
                    <td className="px-2 py-3 text-slate-600">
                      {formatScientistDate(run.queuedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ScientistPanel>
    </ScientistModuleShell>
  );
}

export async function renderScientistAdminUsagePage() {
  await requireAdmin<ScientistAdminUser>();
  const t = await getServerTranslator();
  const usage = await getScientistAdminUsageSummary();

  return (
    <ScientistModuleShell
      eyebrow={SCIENTIST_MODULE_NAME}
      title={t('Usage breakdown')}
      description={t('Aggregated usage by user across all recorded agent executions.')}
      actions={renderActionLink(String(ScientistAdminRoutes.home), t('Back to hub'))}
    >
      <ScientistPanel title={t('Usage breakdown')}>
        {usage.length === 0 ? (
          <p className="text-sm text-slate-600">{t('No runs yet.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">{t('User')}</th>
                  <th className="px-2 py-2">{t('Input tokens')}</th>
                  <th className="px-2 py-2">{t('Output tokens')}</th>
                  <th className="px-2 py-2">{t('Cost')}</th>
                  <th className="px-2 py-2">{t('Updated at')}</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((row) => (
                  <tr key={row.userId} className="border-b border-slate-100">
                    <td className="px-2 py-3 font-medium text-slate-900">
                      {row.userEmail || `user#${row.userId}`}
                    </td>
                    <td className="px-2 py-3 text-slate-600">{row.inputTokens}</td>
                    <td className="px-2 py-3 text-slate-600">{row.outputTokens}</td>
                    <td className="px-2 py-3 text-slate-600">
                      {formatScientistUsd(row.costUsd)}
                    </td>
                    <td className="px-2 py-3 text-slate-600">
                      {formatScientistDate(row.latestAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ScientistPanel>
    </ScientistModuleShell>
  );
}
