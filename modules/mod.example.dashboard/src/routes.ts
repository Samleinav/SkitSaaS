import { RouteApi } from '@skitsaas/sdk';

const BASE = '/modules/mod.example.dashboard';

export const ExampleDashboardApiRoutes = {
  showcasePlaybooks: RouteApi(`${BASE}/showcase-playbooks`)
    .GET()
    .name('mod.example.dashboard.showcase-playbooks'),
} as const;
