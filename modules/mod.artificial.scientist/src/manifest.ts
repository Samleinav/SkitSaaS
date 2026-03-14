import { defineModule, type ModuleManifest } from '@skitsaas/sdk';
import {
  createModulePageRouter,
  parseJsonBody,
  requireAdmin,
  requireUser,
} from '@skitsaas/sdk/server';
import {
  normalizePositiveInt,
  normalizeScientistMode,
  normalizeScientistTier,
  SCIENTIST_MODULE_ID,
  SCIENTIST_MODULE_NAME,
  SCIENTIST_MODULE_VERSION,
} from './constants';
import {
  createScientistRun,
  createScientistSession,
  deleteScientistSessionForUser,
  getScientistAdminUsageSummary,
  getScientistRunDetailForUser,
  getScientistRunStatusForUser,
  getScientistSessionDetailForUser,
  getScientistAgentForUser,
  listScientistAgentsForUser,
  listScientistRunsForAdmin,
  listScientistSessionsForUser,
} from './data';
import { enqueueScientistRunPipeline } from './pipeline/runner';
import {
  ScientistAdminRoutes,
  ScientistApiRoutes,
  ScientistDashboardRoutes,
} from './routes';
import {
  renderScientistAdminHomePage,
  renderScientistAdminRunsPage,
  renderScientistAdminUsagePage,
} from './pages/admin-pages';
import {
  renderScientistDashboardAnalyzePage,
  renderScientistDashboardHubPage,
  renderScientistDashboardRunPage,
  renderScientistDashboardSessionPage,
  renderScientistDashboardSessionsPage,
} from './pages/dashboard-pages';
import type { ScientistRunMode } from './types';

type ScientistSessionUser = {
  id: number;
  role?: string | null;
  email?: string | null;
};

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
) {
  const value = searchParams?.[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

const scientistDashboardPage = createModulePageRouter({
  routes: [
    {
      path: '/',
      handler: () => renderScientistDashboardHubPage(),
    },
    {
      path: '/sessions',
      handler: () => renderScientistDashboardSessionsPage(),
    },
    {
      path: '/sessions/:sessionId',
      handler: ({ params }) => {
        const sessionId = normalizePositiveInt(params.sessionId);
        if (!sessionId) {
          return null;
        }
        return renderScientistDashboardSessionPage(sessionId);
      },
    },
    {
      path: '/sessions/:sessionId/analyze',
      handler: ({ params }) => {
        const sessionId = normalizePositiveInt(params.sessionId);
        if (!sessionId) {
          return null;
        }
        return renderScientistDashboardAnalyzePage(sessionId);
      },
    },
    {
      path: '/runs/:runId',
      handler: ({ params }) => {
        const runId = normalizePositiveInt(params.runId);
        if (!runId) {
          return null;
        }
        return renderScientistDashboardRunPage(runId);
      },
    },
  ],
});

const scientistAdminPage = createModulePageRouter({
  routes: [
    {
      path: '/',
      handler: () => renderScientistAdminHomePage(),
    },
    {
      path: '/runs',
      handler: ({ context }) =>
        renderScientistAdminRunsPage({
          status: readSearchParam(context.searchParams, 'status'),
          tier: readSearchParam(context.searchParams, 'tier'),
        }),
    },
    {
      path: '/usage',
      handler: () => renderScientistAdminUsagePage(),
    },
  ],
});

export default defineModule({
  moduleId: SCIENTIST_MODULE_ID,
  version: SCIENTIST_MODULE_VERSION,
  displayName: SCIENTIST_MODULE_NAME,
  description:
    'AI-powered medical research runs with transparent multi-step execution.',
  adminRouteAliases: [String(ScientistAdminRoutes.home)],
  dashboardRouteAliases: [String(ScientistDashboardRoutes.home)],
  adminNavItems: [
    {
      id: 'mod.artificial.scientist.admin.nav',
      href: String(ScientistAdminRoutes.home),
      label: SCIENTIST_MODULE_NAME,
      order: 72,
    },
  ],
  dashboardNavItems: [
    {
      id: 'mod.artificial.scientist.dashboard.nav',
      href: String(ScientistDashboardRoutes.home),
      label: 'Research',
      order: 72,
    },
  ],
  adminPage: scientistAdminPage,
  dashboardPage: scientistDashboardPage,
  apiRoutes: [
    ScientistApiRoutes.sessionCreate.handler(async (request) => {
      const user = await requireUser<ScientistSessionUser>();
      const body = await parseJsonBody(request);
      if (!body) {
        return jsonError(400, 'Invalid JSON body.');
      }

      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (title.length < 3) {
        return jsonError(400, 'Session title must contain at least 3 characters.');
      }

      const session = await createScientistSession({
        userId: user.id,
        title,
        mode: normalizeScientistMode(body.mode),
      });

      if (!session) {
        return jsonError(500, 'Unable to create session.');
      }

      return Response.json({ ok: true, session }, { status: 201 });
    }),

    ScientistApiRoutes.sessionList.handler(async () => {
      const user = await requireUser<ScientistSessionUser>();
      const sessions = await listScientistSessionsForUser(user.id);
      return Response.json({ ok: true, sessions });
    }),

    ScientistApiRoutes.sessionGet.handler(async (_request, params) => {
      const user = await requireUser<ScientistSessionUser>();
      const sessionId = normalizePositiveInt(params.sessionId);
      if (!sessionId) {
        return jsonError(400, 'Invalid session id.');
      }

      const detail = await getScientistSessionDetailForUser(sessionId, user.id);
      if (!detail) {
        return jsonError(404, 'Session not found.');
      }

      return Response.json({ ok: true, ...detail });
    }),

    ScientistApiRoutes.sessionDelete.handler(async (_request, params) => {
      const user = await requireUser<ScientistSessionUser>();
      const sessionId = normalizePositiveInt(params.sessionId);
      if (!sessionId) {
        return jsonError(400, 'Invalid session id.');
      }

      const deleted = await deleteScientistSessionForUser(sessionId, user.id);
      if (!deleted) {
        return jsonError(404, 'Session not found.');
      }

      return Response.json({ ok: true });
    }),

    ScientistApiRoutes.runCreate.handler(async (request, params) => {
      const user = await requireUser<ScientistSessionUser>();
      const sessionId = normalizePositiveInt(params.sessionId);
      if (!sessionId) {
        return jsonError(400, 'Invalid session id.');
      }

      const body = await parseJsonBody(request);
      if (!body) {
        return jsonError(400, 'Invalid JSON body.');
      }

      const rawQuery = typeof body.rawQuery === 'string' ? body.rawQuery.trim() : '';
      if (rawQuery.length < 8) {
        return jsonError(400, 'Research question must contain at least 8 characters.');
      }

      const run = await createScientistRun({
        sessionId,
        userId: user.id,
        rawQuery,
        focusOverride:
          typeof body.focusOverride === 'string' ? body.focusOverride.trim() : null,
        tier: normalizeScientistTier(body.tier),
        mode: normalizeScientistMode(
          (typeof body.mode === 'string' ? body.mode : null) as ScientistRunMode | null
        ),
      });

      if (!run) {
        return jsonError(404, 'Session not found.');
      }

      enqueueScientistRunPipeline(run.id);

      return Response.json({ ok: true, run }, { status: 202 });
    }),

    ScientistApiRoutes.runGet.handler(async (_request, params) => {
      const user = await requireUser<ScientistSessionUser>();
      const runId = normalizePositiveInt(params.runId);
      if (!runId) {
        return jsonError(400, 'Invalid run id.');
      }

      const detail = await getScientistRunDetailForUser(runId, user.id);
      if (!detail) {
        return jsonError(404, 'Run not found.');
      }

      return Response.json({ ok: true, ...detail });
    }),

    ScientistApiRoutes.runStatus.handler(async (_request, params) => {
      const user = await requireUser<ScientistSessionUser>();
      const runId = normalizePositiveInt(params.runId);
      if (!runId) {
        return jsonError(400, 'Invalid run id.');
      }

      const status = await getScientistRunStatusForUser(runId, user.id);
      if (!status) {
        return jsonError(404, 'Run not found.');
      }

      return Response.json({ ok: true, ...status });
    }),

    ScientistApiRoutes.runAgents.handler(async (_request, params) => {
      const user = await requireUser<ScientistSessionUser>();
      const runId = normalizePositiveInt(params.runId);
      if (!runId) {
        return jsonError(400, 'Invalid run id.');
      }

      const agents = await listScientistAgentsForUser(runId, user.id);
      if (!agents) {
        return jsonError(404, 'Run not found.');
      }

      return Response.json({ ok: true, agents });
    }),

    ScientistApiRoutes.runAgent.handler(async (_request, params) => {
      const user = await requireUser<ScientistSessionUser>();
      const runId = normalizePositiveInt(params.runId);
      const agentNumber = normalizePositiveInt(params.agentNumber);
      if (!runId || !agentNumber) {
        return jsonError(400, 'Invalid run or agent id.');
      }

      const agent = await getScientistAgentForUser(runId, agentNumber, user.id);
      if (!agent) {
        return jsonError(404, 'Agent step not found.');
      }

      return Response.json({ ok: true, agent });
    }),

    ScientistApiRoutes.adminRuns.handler(async (_request) => {
      await requireAdmin<ScientistSessionUser>();
      const runs = await listScientistRunsForAdmin();
      return Response.json({ ok: true, runs });
    }),

    ScientistApiRoutes.adminUsage.handler(async () => {
      await requireAdmin<ScientistSessionUser>();
      const usage = await getScientistAdminUsageSummary();
      return Response.json({ ok: true, usage });
    }),
  ],
} satisfies ModuleManifest);
