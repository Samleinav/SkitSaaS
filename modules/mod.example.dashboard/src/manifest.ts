import {
  defineModule,
  parseBuildTableQueryState,
  type ModuleManifest,
} from '@skitsaas/sdk';
import { ExampleDashboardApiRoutes } from './routes';
import { listExampleDashboardPlaybooks } from './data';
import {
  renderExampleDashboardFrontendPage,
  renderExampleDashboardPage,
  renderExampleDashboardSlot,
} from './showcase';

function applyDashboardPlaybookQuery(searchParams: URLSearchParams) {
  const query = parseBuildTableQueryState(searchParams);
  const searchValue = query.search?.trim().toLowerCase() || '';
  const stageFilter = query.filters?.stage?.trim().toLowerCase() || '';
  const queryPage = query.page;
  const queryPageSize = query.pageSize;
  const page = typeof queryPage === 'number' && queryPage > 0 ? queryPage : 1;
  const pageSize =
    typeof queryPageSize === 'number' && queryPageSize > 0 ? queryPageSize : 5;

  let items = [...listExampleDashboardPlaybooks()];

  if (searchValue) {
    items = items.filter((item) =>
      [item.title, item.owner]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchValue))
    );
  }

  if (stageFilter) {
    items = items.filter(
      (item) => String(item.stage).toLowerCase() === stageFilter
    );
  }

  if (query.sorting?.columnId === 'title') {
    items.sort((left, right) =>
      left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
    );
  }

  if (query.sorting?.direction === 'desc') {
    items.reverse();
  }

  const total = items.length;
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}

export default defineModule({
  moduleId: 'mod.example.dashboard',
  version: '0.1.0',
  displayName: 'Example Dashboard',
  dashboardRouteAliases: ['/dashboard/custom/example-dashboard'],
  frontendRouteAliases: ['/features/example-dashboard'],
  dashboardNavItems: [
    {
      id: 'mod.example.dashboard.nav',
      href: '/dashboard/custom/example-dashboard',
      label: 'Example Dashboard',
      order: 80
    }
  ],
  apiRoutes: [
    ExampleDashboardApiRoutes.showcasePlaybooks.handler((request) => {
      const searchParams = new URL(request.url).searchParams;
      return Response.json(applyDashboardPlaybookQuery(searchParams));
    }),
  ],
  dashboardPage: async () => renderExampleDashboardPage(),
  frontendPage: async () => renderExampleDashboardFrontendPage(),
  frontendSlots: [
    {
      slotId: 'frontend.contact.form.primary',
      handler: async () => {
        return renderExampleDashboardSlot();
      }
    }
  ]
} satisfies ModuleManifest);
