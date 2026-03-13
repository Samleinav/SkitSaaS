import {
  TemplateBuildForm,
  buildFormField,
  composeBuildFormDefinition
} from '@skitsaas/sdk';
import {
  EXAMPLE_SUITE_ADMIN_ALIAS,
  EXAMPLE_SUITE_API_BASE,
  EXAMPLE_SUITE_DASHBOARD_ALIAS,
  EXAMPLE_SUITE_DEFAULT_PRIORITY,
  EXAMPLE_SUITE_MODULE_ID
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
import {
  ExampleSuiteAdminItemsDataTable,
  ExampleSuiteRecentItemsDataTable,
  type ExampleSuiteAdminTableRow
} from '../example-suite-data-tables';
import {
  createExampleSuiteAdminEditItemFormDefinition,
  createExampleSuiteAdminItemFormDefinition,
  createExampleSuiteSettingsFormDefinition
} from '../forms';
import {
  ExampleSuiteActionLink,
  ExampleSuitePanel,
  ExampleSuiteShell,
  ExampleSuiteSummary
} from '../showcase-shell';

function formatDate(value: Date) {
  return value.toISOString().replace('T', ' ').slice(0, 16);
}

function mapAdminTableRows(
  items: Awaited<ReturnType<typeof listExampleSuiteItemsForAdmin>>
) {
  return items.map(
    (item) =>
      ({
        id: item.id,
        title: item.title,
        description: item.description ?? '-',
        status: item.status,
        priority: item.priority,
        visibilityLabel: item.isPublic ? 'public' : 'private',
        ownerLabel: item.ownerName || item.ownerEmail || '-',
        updatedAt: item.updatedAt.getTime(),
        updatedAtLabel: formatDate(item.updatedAt)
      }) satisfies ExampleSuiteAdminTableRow
  );
}

export async function renderExampleSuiteAdminHomePage() {
  const [settings, items] = await Promise.all([
    getExampleSuiteSettings(),
    listExampleSuiteItemsForAdmin(120)
  ]);
  const tableItems = mapAdminTableRows(items);
  const activeCount = items.filter(
    (item) => item.status.trim().toLowerCase() === 'active'
  ).length;

  return (
    <ExampleSuiteShell
      eyebrow="Source-host comprehensive example"
      title="Example Suite Admin"
      description="The admin route now shows the two main current patterns together: a real remote SDK DataTable backed by the module API and BuildForm flows rendered through the SDK bridge."
      chips={['Remote DataTable', 'SDK TemplateBuildForm', 'Module shell']}
      actions={
        <>
          <ExampleSuiteActionLink
            href={`${EXAMPLE_SUITE_ADMIN_ALIAS}/create`}
            label="Create Item"
            tone="primary"
          />
          <ExampleSuiteActionLink
            href={`${EXAMPLE_SUITE_ADMIN_ALIAS}/settings`}
            label="Module Settings"
          />
        </>
      }
    >
      <ExampleSuitePanel
        eyebrow="Summary"
        title="Runtime snapshot"
        description={`API base: ${EXAMPLE_SUITE_API_BASE}`}
      >
        <ExampleSuiteSummary
          items={[
            { label: 'Records', value: items.length },
            { label: 'Active', value: activeCount },
            {
              label: 'Dashboard create',
              value: settings.allowDashboardCreate ? 'enabled' : 'disabled'
            },
            { label: 'API write mode', value: settings.apiWriteMode },
            { label: 'Default status', value: settings.defaultStatus },
            { label: 'Dashboard alias', value: EXAMPLE_SUITE_DASHBOARD_ALIAS }
          ]}
        />
      </ExampleSuitePanel>

      <ExampleSuitePanel
        eyebrow="Remote table"
        title="Stored items"
        description="Backed by mod_example_suite_items and filtered through source.url."
      >
        {tableItems.length === 0 ? (
          <p className="example-suite-empty">
            No items yet. Create one from the create route.
          </p>
        ) : (
          <ExampleSuiteAdminItemsDataTable items={tableItems} />
        )}
      </ExampleSuitePanel>
    </ExampleSuiteShell>
  );
}

export async function renderExampleSuiteAdminCreatePage() {
  const [settings, latestItems] = await Promise.all([
    getExampleSuiteSettings(),
    listExampleSuiteItemsForAdmin(10)
  ]);
  const recentItems = mapAdminTableRows(latestItems);
  const createForm = composeBuildFormDefinition(
    {
      ...createExampleSuiteAdminItemFormDefinition(),
      id: 'example-suite-admin-create-form'
    },
    {
      request: {
        action: createExampleSuiteItemAdminAction,
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
            href: EXAMPLE_SUITE_ADMIN_ALIAS
          }
        ]
      },
      values: {
        status: settings.defaultStatus,
        priority: EXAMPLE_SUITE_DEFAULT_PRIORITY,
        isPublic: false
      }
    }
  );

  return (
    <ExampleSuiteShell
      eyebrow="Create flow"
      title="Create admin record"
      description="This page keeps the module-owned validated action, but now the surrounding UI is module-owned and the companion table is an SDK local table."
      chips={['Validated action', 'Local companion table']}
      actions={
        <ExampleSuiteActionLink href={EXAMPLE_SUITE_ADMIN_ALIAS} label="Back to module" />
      }
    >
      <div className="example-suite-grid example-suite-grid--two">
        <ExampleSuitePanel
          eyebrow="FormBuilder"
          title="Create item"
          description={`Default status comes from settings: ${settings.defaultStatus}`}
        >
          <TemplateBuildForm
            definition={createForm}
            area="admin"
            route={`${EXAMPLE_SUITE_ADMIN_ALIAS}/create`}
            moduleId={EXAMPLE_SUITE_MODULE_ID}
            slot="mod.example.suite.admin.create.form"
          />
        </ExampleSuitePanel>

        <ExampleSuitePanel
          eyebrow="Local table"
          title="Recent records"
          description="A smaller local DataTable for quick authoring reference."
        >
          {recentItems.length === 0 ? (
            <p className="example-suite-empty">No records yet.</p>
          ) : (
            <ExampleSuiteRecentItemsDataTable items={recentItems} />
          )}
        </ExampleSuitePanel>
      </div>
    </ExampleSuiteShell>
  );
}

export async function renderExampleSuiteAdminEditPage(itemId: number) {
  const item = await getExampleSuiteItemById(itemId);

  if (!item) {
    return (
      <ExampleSuiteShell
        eyebrow="Edit flow"
        title="Item not found"
        description={`No record was found for id ${itemId}.`}
        actions={
          <ExampleSuiteActionLink href={EXAMPLE_SUITE_ADMIN_ALIAS} label="Back to module home" />
        }
      >
        <ExampleSuitePanel
          eyebrow="Missing record"
          title="Nothing to edit"
          description="The route is still useful as an example of guarded module pages."
        >
          <p className="example-suite-empty">
            The requested record no longer exists.
          </p>
        </ExampleSuitePanel>
      </ExampleSuiteShell>
    );
  }

  const baseItemForm = createExampleSuiteAdminEditItemFormDefinition();
  const editForm = composeBuildFormDefinition(
    {
      ...baseItemForm,
      id: `example-suite-admin-edit-${item.id}`
    },
    {
      request: {
        action: updateExampleSuiteItemAdminAction,
        method: 'post'
      },
      submit: {
        idleLabel: 'Save',
        pendingLabel: 'Saving...',
        successLabel: 'Saved',
        align: 'start',
        secondaryActions: [
          {
            label: 'Back',
            href: EXAMPLE_SUITE_ADMIN_ALIAS
          }
        ]
      },
      values: {
        itemId: item.id,
        title: item.title,
        description: item.description ?? '',
        status: item.status,
        priority: item.priority,
        isPublic: item.isPublic
      }
    }
  );

  const deleteForm = composeBuildFormDefinition(
    {
      id: `example-suite-admin-delete-${item.id}`,
      fields: [
        buildFormField.hidden({
          name: 'itemId',
          defaultValue: item.id
        })
      ]
    },
    {
      request: {
        action: deleteExampleSuiteItemAdminAction,
        method: 'post'
      },
      submit: {
        idleLabel: 'Delete',
        pendingLabel: 'Deleting...',
        align: 'start',
        secondaryActions: [
          {
            label: 'Cancel',
            href: EXAMPLE_SUITE_ADMIN_ALIAS
          }
        ],
        confirm: {
          title: `Delete item #${item.id}?`,
          description: 'This action permanently removes the record.',
          confirmLabel: 'Delete',
          cancelLabel: 'Keep item',
          triggerVariant: 'outline',
          confirmVariant: 'destructive'
        }
      }
    }
  );

  return (
    <ExampleSuiteShell
      eyebrow="Edit flow"
      title={`Edit item #${item.id}`}
      description="The edit route stays fully module-owned while using the SDK form path."
      chips={[`status: ${item.status}`, `priority: ${item.priority}`]}
      actions={
        <ExampleSuiteActionLink href={EXAMPLE_SUITE_ADMIN_ALIAS} label="Back to module" />
      }
    >
      <div className="example-suite-grid example-suite-grid--two">
        <ExampleSuitePanel
          eyebrow="Edit"
          title="Update record"
          description="Persists changes in the module-owned table."
        >
          <TemplateBuildForm
            definition={editForm}
            area="admin"
            route={`${EXAMPLE_SUITE_ADMIN_ALIAS}/edit/${item.id}`}
            moduleId={EXAMPLE_SUITE_MODULE_ID}
            slot="mod.example.suite.admin.edit.form"
          />
        </ExampleSuitePanel>

        <ExampleSuitePanel
          eyebrow="Danger zone"
          title="Delete record"
          description="Uses the same form contract for confirm-backed deletion."
        >
          <TemplateBuildForm
            definition={deleteForm}
            area="admin"
            route={`${EXAMPLE_SUITE_ADMIN_ALIAS}/edit/${item.id}`}
            moduleId={EXAMPLE_SUITE_MODULE_ID}
            slot="mod.example.suite.admin.delete.form"
          />
        </ExampleSuitePanel>
      </div>
    </ExampleSuiteShell>
  );
}

export async function renderExampleSuiteAdminSettingsPage() {
  const settings = await getExampleSuiteSettings();
  const baseSettingsForm = createExampleSuiteSettingsFormDefinition();
  const settingsForm = composeBuildFormDefinition(baseSettingsForm, {
    request: {
      action: updateExampleSuiteSettingsAdminAction,
      method: 'post'
    },
    submit: {
      ...baseSettingsForm.submit,
      secondaryActions: [
        {
          label: 'Back',
          href: EXAMPLE_SUITE_ADMIN_ALIAS
        }
      ]
    },
    values: {
      allowDashboardCreate: settings.allowDashboardCreate,
      apiWriteMode: settings.apiWriteMode,
      defaultStatus: settings.defaultStatus
    }
  });

  return (
    <ExampleSuiteShell
      eyebrow="Settings flow"
      title="Module settings"
      description="These values are persisted in mod_example_suite_settings and reused by admin, dashboard and API handlers."
      actions={
        <ExampleSuiteActionLink href={EXAMPLE_SUITE_ADMIN_ALIAS} label="Back to module" />
      }
    >
      <ExampleSuitePanel
        eyebrow="Settings"
        title="Shared runtime options"
        description="A single SDK form controls write permissions and defaults across all example routes."
      >
        <TemplateBuildForm
          definition={settingsForm}
          area="admin"
          route={`${EXAMPLE_SUITE_ADMIN_ALIAS}/settings`}
          moduleId={EXAMPLE_SUITE_MODULE_ID}
          slot="mod.example.suite.admin.settings.form"
        />
      </ExampleSuitePanel>
    </ExampleSuiteShell>
  );
}
