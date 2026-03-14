import { RouteAdmin, RouteApi, RouteDashboard } from '@skitsaas/sdk';
import {
  SCIENTIST_ADMIN_ALIAS,
  SCIENTIST_DASHBOARD_ALIAS,
  SCIENTIST_MODULE_ID,
} from './constants';

const BASE = `/modules/${SCIENTIST_MODULE_ID}`;

export const ScientistApiRoutes = {
  sessionCreate: RouteApi(`${BASE}/sessions`)
    .POST()
    .auth('user')
    .name('scientist.api.sessions.create'),
  sessionList: RouteApi(`${BASE}/sessions`)
    .GET()
    .auth('user')
    .name('scientist.api.sessions.list'),
  sessionGet: RouteApi(`${BASE}/sessions/{sessionId}`)
    .GET()
    .auth('user')
    .name('scientist.api.sessions.get'),
  sessionDelete: RouteApi(`${BASE}/sessions/{sessionId}`)
    .DELETE()
    .auth('user')
    .name('scientist.api.sessions.delete'),
  runCreate: RouteApi(`${BASE}/sessions/{sessionId}/runs`)
    .POST()
    .auth('user')
    .rateLimit({ limit: 5, windowSeconds: 60 })
    .name('scientist.api.runs.create'),
  runGet: RouteApi(`${BASE}/runs/{runId}`)
    .GET()
    .auth('user')
    .name('scientist.api.runs.get'),
  runStatus: RouteApi(`${BASE}/runs/{runId}/status`)
    .GET()
    .auth('user')
    .name('scientist.api.runs.status'),
  runAgents: RouteApi(`${BASE}/runs/{runId}/agents`)
    .GET()
    .auth('user')
    .name('scientist.api.runs.agents'),
  runAgent: RouteApi(`${BASE}/runs/{runId}/agents/{agentNumber}`)
    .GET()
    .auth('user')
    .name('scientist.api.runs.agent'),
  adminRuns: RouteApi(`${BASE}/admin/runs`)
    .GET()
    .auth('admin')
    .name('scientist.api.admin.runs'),
  adminUsage: RouteApi(`${BASE}/admin/usage`)
    .GET()
    .auth('admin')
    .name('scientist.api.admin.usage'),
} as const;

export const ScientistAdminRoutes = {
  home: RouteAdmin(SCIENTIST_ADMIN_ALIAS).name('scientist.admin.home'),
  runs: RouteAdmin(`${SCIENTIST_ADMIN_ALIAS}/runs`).name('scientist.admin.runs'),
  usage: RouteAdmin(`${SCIENTIST_ADMIN_ALIAS}/usage`).name('scientist.admin.usage'),
} as const;

export const ScientistDashboardRoutes = {
  home: RouteDashboard(SCIENTIST_DASHBOARD_ALIAS).name('scientist.dashboard.home'),
  sessions: RouteDashboard(`${SCIENTIST_DASHBOARD_ALIAS}/sessions`).name(
    'scientist.dashboard.sessions'
  ),
  session: RouteDashboard(`${SCIENTIST_DASHBOARD_ALIAS}/sessions/{sessionId}`).name(
    'scientist.dashboard.session'
  ),
  analyze: RouteDashboard(
    `${SCIENTIST_DASHBOARD_ALIAS}/sessions/{sessionId}/analyze`
  ).name('scientist.dashboard.analyze'),
  run: RouteDashboard(`${SCIENTIST_DASHBOARD_ALIAS}/runs/{runId}`).name(
    'scientist.dashboard.run'
  ),
} as const;
