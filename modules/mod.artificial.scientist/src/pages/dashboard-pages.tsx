import Link from 'next/link';
import { requireUser } from '@skitsaas/sdk/server';
import { getServerTranslator } from '@/lib/i18n/server';
import {
  SCIENTIST_MODULE_NAME,
  formatScientistDate,
  formatScientistUsd,
} from '../constants';
import {
  getScientistRunDetailForUser,
  getScientistSessionDetailForUser,
  listScientistRecentRunsForUser,
  listScientistSessionsForUser,
} from '../data';
import {
  getScientistRuntimeConfig,
  isScientistBedrockConfigured,
  isScientistBigQueryConfigured,
  isScientistS3Configured,
} from '../config';
import { ScientistDashboardRoutes } from '../routes';
import {
  ScientistKeyValueList,
  ScientistModuleShell,
  ScientistPanel,
} from '../components/module-shell';
import { ScientistRunLaunchForm } from '../components/run-launch-form';
import { ScientistSessionCreateForm } from '../components/session-create-form';
import { ScientistStatusBadge } from '../components/status-badge';

type ScientistSessionUser = {
  id: number;
  role?: string | null;
  email?: string | null;
};

function shouldShowMockBanner() {
  const config = getScientistRuntimeConfig();
  return (
    config.allowMockPipeline &&
    (!isScientistBigQueryConfigured() ||
      !isScientistBedrockConfigured() ||
      !isScientistS3Configured())
  );
}

function renderActionLink(href: string, label: string, tone: 'primary' | 'neutral' = 'neutral') {
  const className =
    tone === 'primary'
      ? 'inline-flex h-10 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800'
      : 'inline-flex h-10 items-center justify-center rounded-2xl border border-slate-300 px-4 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50';

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function formatFileSize(sizeBytes: number | null | undefined) {
  const size = typeof sizeBytes === 'number' ? sizeBytes : 0;
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
}

export async function renderScientistDashboardHubPage() {
  const t = await getServerTranslator();
  const user = await requireUser<ScientistSessionUser>();
  const [sessions, recentRuns] = await Promise.all([
    listScientistSessionsForUser(user.id),
    listScientistRecentRunsForUser(user.id),
  ]);

  return (
    <ScientistModuleShell
      eyebrow={SCIENTIST_MODULE_NAME}
      title={t('Research sessions')}
      description={t(
        'Create medical research sessions, launch transparent multi-step runs, and inspect every agent output from the same dashboard.'
      )}
      actions={renderActionLink(String(ScientistDashboardRoutes.sessions), t('Research sessions'))}
      notice={
        shouldShowMockBanner()
          ? t(
              'Cloud providers are not configured, so the pipeline is using deterministic local responses.'
            )
          : null
      }
    >
      <ScientistPanel
        title={t('Create session')}
        description={t(
          'Start with a session container, then branch into one or more focused research runs.'
        )}
      >
        <ScientistSessionCreateForm />
      </ScientistPanel>

      <ScientistPanel
        title={t('Research sessions')}
        description={t('Each session groups runs that share the same research theme.')}
      >
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-600">{t('No sessions yet.')}</p>
        ) : (
          <div className="grid gap-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-950">
                      {session.title}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {session.mode} · {session.runCount} runs · {session.activeRunCount}{' '}
                      active
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {renderActionLink(
                      ScientistDashboardRoutes.session.with({ sessionId: session.id }),
                      t('Open session')
                    )}
                    {renderActionLink(
                      ScientistDashboardRoutes.analyze.with({ sessionId: session.id }),
                      t('Launch research run'),
                      'primary'
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScientistPanel>

      <ScientistPanel
        title={t('Recent runs')}
        description={t('Track the latest executions and jump directly into run transparency details.')}
      >
        {recentRuns.length === 0 ? (
          <p className="text-sm text-slate-600">{t('No runs yet.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">{t('Session detail')}</th>
                  <th className="px-2 py-2">{t('Status')}</th>
                  <th className="px-2 py-2">{t('Tier')}</th>
                  <th className="px-2 py-2">{t('Created at')}</th>
                  <th className="px-2 py-2">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id} className="border-b border-slate-100">
                    <td className="px-2 py-3 font-medium text-slate-900">
                      {run.sessionTitle}
                    </td>
                    <td className="px-2 py-3">
                      <ScientistStatusBadge status={run.status} />
                    </td>
                    <td className="px-2 py-3 text-slate-600">{run.tier}</td>
                    <td className="px-2 py-3 text-slate-600">
                      {formatScientistDate(run.queuedAt)}
                    </td>
                    <td className="px-2 py-3">
                      {renderActionLink(
                        ScientistDashboardRoutes.run.with({ runId: run.id }),
                        t('Open run')
                      )}
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

export async function renderScientistDashboardSessionsPage() {
  const t = await getServerTranslator();
  const user = await requireUser<ScientistSessionUser>();
  const sessions = await listScientistSessionsForUser(user.id);

  return (
    <ScientistModuleShell
      eyebrow={SCIENTIST_MODULE_NAME}
      title={t('Research sessions')}
      description={t('Manage all of your session containers from one place.')}
      actions={renderActionLink(String(ScientistDashboardRoutes.home), t('Back to hub'))}
      notice={
        shouldShowMockBanner()
          ? t('Mock mode active')
          : null
      }
    >
      <ScientistPanel title={t('Create another session')}>
        <ScientistSessionCreateForm />
      </ScientistPanel>

      <ScientistPanel title={t('Research sessions')}>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-600">{t('No sessions yet.')}</p>
        ) : (
          <div className="grid gap-3">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-950">
                      {session.title}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {session.mode} · {session.runCount} runs · updated{' '}
                      {formatScientistDate(session.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {renderActionLink(
                      ScientistDashboardRoutes.session.with({ sessionId: session.id }),
                      t('Open session')
                    )}
                    {renderActionLink(
                      ScientistDashboardRoutes.analyze.with({ sessionId: session.id }),
                      t('Launch research run'),
                      'primary'
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScientistPanel>
    </ScientistModuleShell>
  );
}

export async function renderScientistDashboardSessionPage(sessionId: number) {
  const t = await getServerTranslator();
  const user = await requireUser<ScientistSessionUser>();
  const detail = await getScientistSessionDetailForUser(sessionId, user.id);

  if (!detail) {
    return null;
  }

  return (
    <ScientistModuleShell
      eyebrow={SCIENTIST_MODULE_NAME}
      title={detail.session.title}
      description={t('Session detail')}
      actions={
        <>
          {renderActionLink(String(ScientistDashboardRoutes.sessions), t('Back to sessions'))}
          {renderActionLink(
            ScientistDashboardRoutes.analyze.with({ sessionId }),
            t('Launch research run'),
            'primary'
          )}
        </>
      }
      notice={
        shouldShowMockBanner()
          ? t('Mock mode active')
          : null
      }
    >
      <ScientistPanel title={t('Overview')}>
        <ScientistKeyValueList
          items={[
            { label: t('Mode'), value: detail.session.mode },
            { label: t('Total runs'), value: detail.runs.length },
            {
              label: t('Created at'),
              value: formatScientistDate(detail.session.createdAt),
            },
            {
              label: t('Updated at'),
              value: formatScientistDate(detail.session.updatedAt),
            },
          ]}
        />
      </ScientistPanel>

      <ScientistPanel title={t('Run pipeline')}>
        {detail.runs.length === 0 ? (
          <p className="text-sm text-slate-600">{t('No runs yet.')}</p>
        ) : (
          <div className="grid gap-3">
            {detail.runs.map((run) => (
              <div key={run.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <ScientistStatusBadge status={run.status} />
                      <span className="text-sm text-slate-600">{run.tier}</span>
                    </div>
                    <p className="text-sm text-slate-800">{run.rawQuery}</p>
                    <p className="text-xs text-slate-500">
                      {formatScientistDate(run.queuedAt)}
                    </p>
                  </div>
                  {renderActionLink(
                    ScientistDashboardRoutes.run.with({ runId: run.id }),
                    t('Open run')
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScientistPanel>
    </ScientistModuleShell>
  );
}

export async function renderScientistDashboardAnalyzePage(sessionId: number) {
  const t = await getServerTranslator();
  const user = await requireUser<ScientistSessionUser>();
  const detail = await getScientistSessionDetailForUser(sessionId, user.id);

  if (!detail) {
    return null;
  }

  return (
    <ScientistModuleShell
      eyebrow={SCIENTIST_MODULE_NAME}
      title={t('Launch research run')}
      description={detail.session.title}
      actions={renderActionLink(
        ScientistDashboardRoutes.session.with({ sessionId }),
        t('Back to sessions')
      )}
      notice={
        shouldShowMockBanner()
          ? t(
              'Cloud providers are not configured, so the pipeline is using deterministic local responses.'
            )
          : null
      }
    >
      <ScientistPanel
        title={t('Launch research run')}
        description={t('This creates the run immediately and processes the four pipeline steps asynchronously.')}
      >
        <ScientistRunLaunchForm sessionId={sessionId} />
      </ScientistPanel>
    </ScientistModuleShell>
  );
}

export async function renderScientistDashboardRunPage(runId: number) {
  const t = await getServerTranslator();
  const user = await requireUser<ScientistSessionUser>();
  const detail = await getScientistRunDetailForUser(runId, user.id);

  if (!detail) {
    return null;
  }

  return (
    <ScientistModuleShell
      eyebrow={SCIENTIST_MODULE_NAME}
      title={t('Run detail')}
      description={detail.run.rawQuery}
      actions={
        detail.session
          ? renderActionLink(
              ScientistDashboardRoutes.session.with({
                sessionId: detail.session.id,
              }),
              t('Back to sessions')
            )
          : undefined
      }
      notice={
        shouldShowMockBanner()
          ? t('Mock mode active')
          : null
      }
    >
      <ScientistPanel title={t('Overview')}>
        <ScientistKeyValueList
          items={[
            { label: t('Run status'), value: <ScientistStatusBadge status={detail.run.status} /> },
            { label: t('Tier'), value: detail.run.tier },
            { label: t('Mode'), value: detail.run.mode },
            { label: t('Cost'), value: formatScientistUsd(detail.run.costUsdTotal) },
          ]}
        />
      </ScientistPanel>

      <ScientistPanel title={t('Hypotheses')}>
        {detail.hypotheses.length === 0 ? (
          <p className="text-sm text-slate-600">{t('No hypotheses yet.')}</p>
        ) : (
          <div className="grid gap-3">
            {detail.hypotheses.map((hypothesis) => (
              <div key={hypothesis.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-950">{hypothesis.title}</h3>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {t('Evidence level')}: {hypothesis.evidenceLevel || '-'}
                  </span>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-2xl bg-slate-50 p-3 text-xs text-slate-700">
                  {JSON.stringify(hypothesis.content, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </ScientistPanel>

      <ScientistPanel title={t('Storage artifacts')}>
        {detail.files.length === 0 ? (
          <p className="text-sm text-slate-600">{t('No files available yet.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">{t('Files')}</th>
                  <th className="px-2 py-2">{t('Storage artifacts')}</th>
                  <th className="px-2 py-2">{t('Created at')}</th>
                </tr>
              </thead>
              <tbody>
                {detail.files.map((file) => (
                  <tr key={file.id} className="border-b border-slate-100">
                    <td className="px-2 py-3 text-slate-900">
                      <div className="font-medium">{file.fileType}</div>
                      <div className="text-xs text-slate-500">{file.s3Key}</div>
                    </td>
                    <td className="px-2 py-3 text-slate-600">
                      {formatFileSize(file.sizeBytes)}
                    </td>
                    <td className="px-2 py-3 text-slate-600">
                      {formatScientistDate(file.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ScientistPanel>

      <ScientistPanel title={t('Knowledge graph')}>
        <ScientistKeyValueList
          items={[
            { label: t('Nodes'), value: detail.nodes.length },
            { label: t('Edges'), value: detail.edges.length },
            {
              label: t('Papers'),
              value: Array.isArray(detail.run.meshTerms) ? detail.run.meshTerms.length : 0,
            },
            {
              label: t('Created at'),
              value: formatScientistDate(detail.run.startedAt || detail.run.queuedAt),
            },
          ]}
        />
      </ScientistPanel>

      <ScientistPanel title={t('Agent steps')}>
        {detail.agents.length === 0 ? (
          <p className="text-sm text-slate-600">{t('No agent activity yet.')}</p>
        ) : (
          <div className="grid gap-3">
            {detail.agents.map((agent) => (
              <details key={agent.id} className="rounded-2xl border border-slate-200 p-4">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-slate-950">
                        Agent {agent.agentNumber}
                      </span>
                      <ScientistStatusBadge status={agent.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      {agent.modelId} · {t('Input tokens')}: {agent.inputTokens} ·{' '}
                      {t('Output tokens')}: {agent.outputTokens}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatScientistDate(agent.completedAt || agent.startedAt)}
                  </span>
                </summary>
                <div className="mt-4 grid gap-4">
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-700">
                      {t('Prompt input')}
                    </h4>
                    <pre className="overflow-x-auto rounded-2xl bg-slate-50 p-3 text-xs text-slate-700">
                      {agent.promptInput || '-'}
                    </pre>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-slate-700">
                      {t('Prompt output')}
                    </h4>
                    <pre className="overflow-x-auto rounded-2xl bg-slate-50 p-3 text-xs text-slate-700">
                      {agent.promptOutput || '-'}
                    </pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </ScientistPanel>
    </ScientistModuleShell>
  );
}
