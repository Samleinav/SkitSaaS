import Link from 'next/link';
import { ArrowLeft, PencilLine, Plus, Settings, Trash2 } from 'lucide-react';
import { AsyncSubmitButton } from '@/components/ui/async-submit-button';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  EXAMPLE_SUITE_ADMIN_ALIAS,
  EXAMPLE_SUITE_API_BASE,
  EXAMPLE_SUITE_DASHBOARD_ALIAS
} from '../constants';
import {
  createExampleSuiteItemAdminAction,
  deleteExampleSuiteItemAdminAction,
  updateExampleSuiteItemAdminAction,
  updateExampleSuiteSettingsAdminAction
} from '../actions';
import {
  getExampleSuiteItemById,
  getExampleSuiteSettings,
  listExampleSuiteItemsForAdmin
} from '../data';

function formatDate(value: Date) {
  return value.toISOString().replace('T', ' ').slice(0, 16);
}

function StatusPill({ value }: { value: string }) {
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

export async function renderExampleSuiteAdminHomePage() {
  const [settings, items] = await Promise.all([
    getExampleSuiteSettings(),
    listExampleSuiteItemsForAdmin(120)
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Example Suite Module</CardTitle>
          <CardDescription>
            End-to-end example with module-owned DB tables, admin/dashboard pages,
            server actions, and API routing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Admin root: <code>{EXAMPLE_SUITE_ADMIN_ALIAS}</code>
          </p>
          <p>
            Dashboard root: <code>{EXAMPLE_SUITE_DASHBOARD_ALIAS}</code>
          </p>
          <p>
            API base: <code>{EXAMPLE_SUITE_API_BASE}</code>
          </p>
          <p>
            Current settings: dashboard create is{' '}
            <strong>{settings.allowDashboardCreate ? 'enabled' : 'disabled'}</strong>
            , API write mode is <strong>{settings.apiWriteMode}</strong>, default
            status is <strong>{settings.defaultStatus}</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`${EXAMPLE_SUITE_ADMIN_ALIAS}/create`}>
                <Plus className="h-4 w-4" />
                Create Item
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`${EXAMPLE_SUITE_ADMIN_ALIAS}/settings`}>
                <Settings className="h-4 w-4" />
                Module Settings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stored Items</CardTitle>
          <CardDescription>
            Backed by <code>mod_example_suite_items</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No items yet. Create one from the create route.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2">Id</th>
                    <th className="px-2 py-2">Title</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Priority</th>
                    <th className="px-2 py-2">Visibility</th>
                    <th className="px-2 py-2">Owner</th>
                    <th className="px-2 py-2">Updated</th>
                    <th className="px-2 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-border/60">
                      <td className="px-2 py-2 font-mono">{item.id}</td>
                      <td className="px-2 py-2">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {item.description ?? '-'}
                        </p>
                      </td>
                      <td className="px-2 py-2">
                        <StatusPill value={item.status} />
                      </td>
                      <td className="px-2 py-2">{item.priority}</td>
                      <td className="px-2 py-2">
                        {item.isPublic ? 'public' : 'private'}
                      </td>
                      <td className="px-2 py-2">
                        {item.ownerName || item.ownerEmail || '-'}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">
                        {formatDate(item.updatedAt)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`${EXAMPLE_SUITE_ADMIN_ALIAS}/edit/${item.id}`}>
                              <PencilLine className="h-4 w-4" />
                              Edit
                            </Link>
                          </Button>
                          <form action={deleteExampleSuiteItemAdminAction}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <AsyncSubmitButton
                              size="sm"
                              variant="outline"
                              idleLabel="Delete"
                              pendingLabel="Deleting..."
                            />
                          </form>
                        </div>
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

export async function renderExampleSuiteAdminCreatePage() {
  const [settings, latestItems] = await Promise.all([
    getExampleSuiteSettings(),
    listExampleSuiteItemsForAdmin(10)
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Item</CardTitle>
          <CardDescription>
            Creates a row in <code>mod_example_suite_items</code> using
            <code> adminAction</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createExampleSuiteItemAdminAction} className="space-y-4">
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
                placeholder="Campaign launch checklist"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Optional details for dashboard and API consumers."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={settings.defaultStatus}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="archived">archived</option>
                </select>
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
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPublic"
                value="true"
                className="h-4 w-4 rounded border-input"
              />
              Expose item in public API listing
            </label>

            <div className="flex flex-wrap gap-2">
              <AsyncSubmitButton
                size="sm"
                idleLabel="Create"
                pendingLabel="Creating..."
                successLabel="Created"
              />
              <Button asChild size="sm" variant="outline">
                <Link href={EXAMPLE_SUITE_ADMIN_ALIAS}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {latestItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records yet.</p>
          ) : (
            latestItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border/70 px-3 py-2"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  #{item.id} - {item.status} - {formatDate(item.updatedAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export async function renderExampleSuiteAdminEditPage(itemId: number) {
  const item = await getExampleSuiteItemById(itemId);

  if (!item) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Item Not Found</CardTitle>
          <CardDescription>
            No record was found for id <code>{itemId}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link href={EXAMPLE_SUITE_ADMIN_ALIAS}>
              <ArrowLeft className="h-4 w-4" />
              Back to module home
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Item #{item.id}</CardTitle>
          <CardDescription>
            Update values and persist changes in module-owned table.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateExampleSuiteItemAdminAction} className="space-y-4">
            <input type="hidden" name="itemId" value={item.id} />

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <input
                id="title"
                name="title"
                required
                maxLength={120}
                defaultValue={item.title}
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
                rows={4}
                defaultValue={item.description ?? ''}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={item.status}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="archived">archived</option>
                </select>
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
                  defaultValue={item.priority}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPublic"
                value="true"
                defaultChecked={item.isPublic}
                className="h-4 w-4 rounded border-input"
              />
              Public visibility
            </label>

            <div className="flex flex-wrap gap-2">
              <AsyncSubmitButton
                size="sm"
                idleLabel="Save"
                pendingLabel="Saving..."
                successLabel="Saved"
              />
              <Button asChild size="sm" variant="outline">
                <Link href={EXAMPLE_SUITE_ADMIN_ALIAS}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Delete this record permanently.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteExampleSuiteItemAdminAction} className="flex gap-2">
            <input type="hidden" name="itemId" value={item.id} />
            <AsyncSubmitButton
              size="sm"
              variant="outline"
              idleLabel="Delete"
              pendingLabel="Deleting..."
            />
            <Button asChild size="sm" variant="outline">
              <Link href={EXAMPLE_SUITE_ADMIN_ALIAS}>
                <Trash2 className="h-4 w-4" />
                Cancel
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export async function renderExampleSuiteAdminSettingsPage() {
  const settings = await getExampleSuiteSettings();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Module Settings</CardTitle>
          <CardDescription>
            Stored in <code>mod_example_suite_settings</code> and used by admin,
            dashboard and API handlers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateExampleSuiteSettingsAdminAction} className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allowDashboardCreate"
                value="true"
                defaultChecked={settings.allowDashboardCreate}
                className="h-4 w-4 rounded border-input"
              />
              Allow dashboard users to create records
            </label>

            <div className="space-y-2">
              <label htmlFor="apiWriteMode" className="text-sm font-medium">
                API write mode
              </label>
              <select
                id="apiWriteMode"
                name="apiWriteMode"
                defaultValue={settings.apiWriteMode}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="authenticated">authenticated users</option>
                <option value="admin">admins only</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="defaultStatus" className="text-sm font-medium">
                Default status for new records
              </label>
              <select
                id="defaultStatus"
                name="defaultStatus"
                defaultValue={settings.defaultStatus}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <AsyncSubmitButton
                size="sm"
                idleLabel="Save Settings"
                pendingLabel="Saving..."
              />
              <Button asChild size="sm" variant="outline">
                <Link href={EXAMPLE_SUITE_ADMIN_ALIAS}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
