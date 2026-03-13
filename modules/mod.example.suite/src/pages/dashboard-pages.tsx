import {
  TemplateBuildForm,
  composeBuildFormDefinition
} from '@skitsaas/sdk';
import { getUser } from '@skitsaas/sdk/server';
import { EXAMPLE_SUITE_DASHBOARD_ALIAS } from '../constants';
import { createExampleSuiteItemDashboardAction } from '../actions';
import {
  getEditableExampleSuiteItemForUser,
  getExampleSuiteSettings,
  listExampleSuiteItemsForUser
} from '../data';
import {
  ExampleSuiteDashboardItemsDataTable,
  type ExampleSuiteDashboardTableRow
} from '../example-suite-data-tables';
import { createExampleSuiteDashboardItemFormDefinition } from '../forms';
import {
  ExampleSuiteActionLink,
  ExampleSuiteDetailList,
  ExampleSuitePanel,
  ExampleSuiteShell,
  ExampleSuiteSummary
} from '../showcase-shell';

type ExampleSuiteSessionUser = {
  id: number;
  role?: string | null;
};

function formatDate(value: Date) {
  return value.toISOString().replace('T', ' ').slice(0, 16);
}

function mapDashboardTableRows(
  items: Awaited<ReturnType<typeof listExampleSuiteItemsForUser>>
) {
  return items.map(
    (item) =>
      ({
        id: item.id,
        title: item.title,
        status: item.status,
        priority: item.priority,
        visibilityLabel: item.isPublic ? 'public' : 'private',
        updatedAt: item.updatedAt.getTime(),
        updatedAtLabel: formatDate(item.updatedAt)
      }) satisfies ExampleSuiteDashboardTableRow
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
  const tableItems = mapDashboardTableRows(items);

  return (
    <ExampleSuiteShell
      eyebrow="Dashboard route"
      title="Example Suite Dashboard"
      description="The dashboard side now mirrors the admin module visually while keeping a local SDK DataTable and a dedicated dashboard-only create form."
      chips={['Local DataTable', 'Owner-aware records']}
      actions={
        settings.allowDashboardCreate ? (
          <ExampleSuiteActionLink
            href={`${EXAMPLE_SUITE_DASHBOARD_ALIAS}/create`}
            label="New Record"
            tone="primary"
          />
        ) : undefined
      }
    >
      <ExampleSuitePanel
        eyebrow="Summary"
        title="Your visibility"
        description="Records are visible when they are public or owned by your user."
      >
        <ExampleSuiteSummary
          items={[
            { label: 'Visible records', value: items.length },
            { label: 'Owned by you', value: ownItemsCount },
            { label: 'Public', value: publicItemsCount },
            {
              label: 'Create access',
              value: settings.allowDashboardCreate ? 'enabled' : 'disabled'
            }
          ]}
        />
      </ExampleSuitePanel>

      <ExampleSuitePanel
        eyebrow="Local table"
        title="Visible records"
        description="This route intentionally keeps the table local to contrast with the remote admin view."
      >
        {tableItems.length === 0 ? (
          <p className="example-suite-empty">No records available.</p>
        ) : (
          <ExampleSuiteDashboardItemsDataTable items={tableItems} />
        )}
      </ExampleSuitePanel>
    </ExampleSuiteShell>
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

  const createForm = composeBuildFormDefinition(
    createExampleSuiteDashboardItemFormDefinition(),
    {
      request: {
        action: createExampleSuiteItemDashboardAction,
        method: 'post'
      },
      submit: {
        idleLabel: 'Create',
        pendingLabel: 'Creating...',
        successLabel: 'Created',
        align: 'start',
        secondaryActions: [
          {
            label: 'Back',
            href: EXAMPLE_SUITE_DASHBOARD_ALIAS
          }
        ]
      },
      values: {
        priority: 3,
        isPublic: false
      }
    }
  );

  return (
    <ExampleSuiteShell
      eyebrow="Dashboard create"
      title="Create dashboard record"
      description="The dashboard route now uses the same SDK form contract instead of a handwritten HTML form."
      chips={[`default status: ${settings.defaultStatus}`]}
      actions={
        <ExampleSuiteActionLink href={EXAMPLE_SUITE_DASHBOARD_ALIAS} label="Back to module" />
      }
    >
      <ExampleSuitePanel
        eyebrow="FormBuilder"
        title="Create record"
        description="Available only when module settings allow dashboard writes."
      >
        {!settings.allowDashboardCreate ? (
          <p className="example-suite-empty">
            Dashboard create is disabled by module settings.
          </p>
        ) : (
          <TemplateBuildForm
            definition={createForm}
            area="dashboard"
            route={`${EXAMPLE_SUITE_DASHBOARD_ALIAS}/create`}
            moduleId="mod.example.suite"
            slot="mod.example.suite.dashboard.create.form"
          />
        )}
      </ExampleSuitePanel>
    </ExampleSuiteShell>
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
      <ExampleSuiteShell
        eyebrow="Dashboard detail"
        title="Record not available"
        description="The item does not exist or is not owned by your user."
        actions={
          <ExampleSuiteActionLink href={EXAMPLE_SUITE_DASHBOARD_ALIAS} label="Back to module" />
        }
      >
        <ExampleSuitePanel
          eyebrow="Unavailable"
          title="Nothing to show"
          description="Dashboard item routes stay owner-aware."
        >
          <p className="example-suite-empty">
            The record is hidden or no longer exists.
          </p>
        </ExampleSuitePanel>
      </ExampleSuiteShell>
    );
  }

  return (
    <ExampleSuiteShell
      eyebrow="Dashboard detail"
      title={item.title}
      description="Owner-only route backed by the same module-owned record."
      chips={[item.isPublic ? 'public' : 'private', `priority ${item.priority}`]}
      actions={
        <ExampleSuiteActionLink href={EXAMPLE_SUITE_DASHBOARD_ALIAS} label="Back to module" />
      }
    >
      <ExampleSuitePanel
        eyebrow="Record detail"
        title={`Record #${item.id}`}
        description="Useful for showing that module UX can diverge from the host while keeping the same data model."
      >
        <ExampleSuiteDetailList
          items={[
            { label: 'Status', value: item.status },
            { label: 'Priority', value: item.priority },
            { label: 'Visibility', value: item.isPublic ? 'public' : 'private' },
            { label: 'Description', value: item.description || '-' },
            { label: 'Updated', value: formatDate(item.updatedAt) }
          ]}
        />
      </ExampleSuitePanel>
    </ExampleSuiteShell>
  );
}
