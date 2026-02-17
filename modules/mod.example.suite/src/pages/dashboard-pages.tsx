import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { AsyncSubmitButton } from '@/components/ui/async-submit-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { getUser } from '@skitsaas/sdk/server';
import { EXAMPLE_SUITE_DASHBOARD_ALIAS } from '../constants';
import { createExampleSuiteItemDashboardAction } from '../actions';
import {
  getEditableExampleSuiteItemForUser,
  getExampleSuiteSettings,
  listExampleSuiteItemsForUser
} from '../data';

type ExampleSuiteSessionUser = {
  id: number;
  role?: string | null;
};

function formatDate(value: Date) {
  return value.toISOString().replace('T', ' ').slice(0, 16);
}

function DashboardStatus({ value }: { value: string }) {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'active') {
    return (
      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">
        active
      </span>
    );
  }

  if (normalized === 'archived') {
    return (
      <span className="rounded-full border border-slate-500/40 bg-slate-500/10 px-2 py-0.5 text-xs text-slate-700">
        archived
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700">
      draft
    </span>
  );
}

export async function renderExampleSuiteDashboardHomePage() {
  const user = await getUser<ExampleSuiteSessionUser>();
  if (!user) {
    return null;
  }

  const [settings, items] = await Promise.all([
    getExampleSuiteSettings(),
    listExampleSuiteItemsForUser({ userId: user.id, limit: 120 })
  ]);

  const ownItemsCount = items.filter((item) => item.ownerUserId === user.id).length;
  const publicItemsCount = items.filter((item) => item.isPublic).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Example Suite Dashboard</CardTitle>
          <CardDescription>
            You can view public records and records you own.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Records visible now: <strong>{items.length}</strong> (
            <strong>{ownItemsCount}</strong> owned, <strong>{publicItemsCount}</strong>{' '}
            public)
          </p>
          <p>
            Dashboard create permission:{' '}
            <strong>{settings.allowDashboardCreate ? 'enabled' : 'disabled'}</strong>
          </p>
          {settings.allowDashboardCreate ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`${EXAMPLE_SUITE_DASHBOARD_ALIAS}/create`}>
                <Plus className="h-4 w-4" />
                New Record
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Records</CardTitle>
          <CardDescription>Private items from other users are hidden.</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2">Id</th>
                    <th className="px-2 py-2">Title</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Priority</th>
                    <th className="px-2 py-2">Visibility</th>
                    <th className="px-2 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-border/60">
                      <td className="px-2 py-2 font-mono">{item.id}</td>
                      <td className="px-2 py-2">
                        <Link
                          href={`${EXAMPLE_SUITE_DASHBOARD_ALIAS}/items/${item.id}`}
                          className="font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-2 py-2">
                        <DashboardStatus value={item.status} />
                      </td>
                      <td className="px-2 py-2">{item.priority}</td>
                      <td className="px-2 py-2">
                        {item.isPublic ? 'public' : 'private'}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">
                        {formatDate(item.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export async function renderExampleSuiteDashboardCreatePage() {
  const [user, settings] = await Promise.all([
    getUser<ExampleSuiteSessionUser>(),
    getExampleSuiteSettings()
  ]);
  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Create</CardTitle>
          <CardDescription>
            Form available when module setting allows dashboard writes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!settings.allowDashboardCreate ? (
            <p className="text-sm text-muted-foreground">
              Dashboard create is disabled by module settings.
            </p>
          ) : (
            <form action={createExampleSuiteItemDashboardAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  required
                  maxLength={120}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="priority" className="text-sm font-medium">
                  Priority (1-5)
                </label>
                <input
                  id="priority"
                  name="priority"
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={3}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isPublic"
                  value="true"
                  className="h-4 w-4 rounded border-input"
                />
                Publish item to public API list
              </label>

              <div className="flex flex-wrap gap-2">
                <AsyncSubmitButton
                  size="sm"
                  idleLabel="Create"
                  pendingLabel="Creating..."
                  successLabel="Created"
                />
                <Button asChild size="sm" variant="outline">
                  <Link href={EXAMPLE_SUITE_DASHBOARD_ALIAS}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Link>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export async function renderExampleSuiteDashboardItemPage(itemId: number) {
  const user = await getUser<ExampleSuiteSessionUser>();
  if (!user) {
    return null;
  }

  const item = await getEditableExampleSuiteItemForUser({
    itemId,
    userId: user.id
  });

  if (!item) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Record Not Available</CardTitle>
          <CardDescription>
            The item does not exist or is not owned by your user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link href={EXAMPLE_SUITE_DASHBOARD_ALIAS}>
              <ArrowLeft className="h-4 w-4" />
              Back to module
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
        <CardDescription>
          Owner-only detail page from a dashboard module route.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <strong>Status:</strong> <DashboardStatus value={item.status} />
        </p>
        <p>
          <strong>Priority:</strong> {item.priority}
        </p>
        <p>
          <strong>Visibility:</strong> {item.isPublic ? 'public' : 'private'}
        </p>
        <p>
          <strong>Description:</strong> {item.description || '-'}
        </p>
        <p>
          <strong>Updated:</strong> <code>{formatDate(item.updatedAt)}</code>
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href={EXAMPLE_SUITE_DASHBOARD_ALIAS}>
            <ArrowLeft className="h-4 w-4" />
            Back to module
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
