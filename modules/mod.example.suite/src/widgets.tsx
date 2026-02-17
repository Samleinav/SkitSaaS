import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EXAMPLE_SUITE_ADMIN_ALIAS, EXAMPLE_SUITE_DASHBOARD_ALIAS } from './constants';
import { getExampleSuiteSettings, listExampleSuiteItemsForAdmin } from './data';

export async function ExampleSuiteAdminWidget() {
  const [settings, items] = await Promise.all([
    getExampleSuiteSettings(),
    listExampleSuiteItemsForAdmin(12)
  ]);

  const activeCount = items.filter(
    (item) => item.status.trim().toLowerCase() === 'active'
  ).length;
  const publicCount = items.filter((item) => item.isPublic).length;

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Example Suite Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          total items: <strong>{items.length}</strong>
        </p>
        <p>
          active: <strong>{activeCount}</strong>, public: <strong>{publicCount}</strong>
        </p>
        <p>
          API write mode: <strong>{settings.apiWriteMode}</strong>
        </p>
        <p>
          dashboard create: <strong>{settings.allowDashboardCreate ? 'on' : 'off'}</strong>
        </p>
        <p>
          <Link
            href={EXAMPLE_SUITE_ADMIN_ALIAS}
            className="underline-offset-2 hover:underline"
          >
            Open admin module
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export async function ExampleSuiteDashboardWidget() {
  const items = await listExampleSuiteItemsForAdmin(6);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Example Suite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>Recent records available: {items.length}</p>
        <p>
          <Link
            href={EXAMPLE_SUITE_DASHBOARD_ALIAS}
            className="underline-offset-2 hover:underline"
          >
            Open dashboard module
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
