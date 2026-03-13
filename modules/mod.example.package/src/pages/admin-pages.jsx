import React from 'react';
import {
  TemplateBuildForm,
  buildFormField,
  composeBuildFormDefinition
} from '@skitsaas/sdk';
import {
  EXAMPLE_PACKAGE_ADMIN_ALIAS,
  EXAMPLE_PACKAGE_API_BASE,
  EXAMPLE_PACKAGE_DASHBOARD_ALIAS,
  EXAMPLE_PACKAGE_DEFAULT_PRIORITY
} from '../constants.js';
import {
  createExamplePackageItemAdminAction,
  deleteExamplePackageItemAdminAction,
  updateExamplePackageItemAdminAction,
  updateExamplePackageSettingsAdminAction
} from '../actions.js';
import {
  getExamplePackageItemById,
  getExamplePackageSettings,
  listExamplePackageItemsForAdmin
} from '../data.js';
import {
  createExamplePackageAdminEditItemFormDefinition,
  createExamplePackageAdminItemFormDefinition,
  createExamplePackageSettingsFormDefinition
} from '../forms.js';
import {
  ActionLink,
  InfoText,
  ModuleCard,
  ModuleLayout
} from '../ui/module-ui.jsx';
import {
  ExamplePackageAdminItemsDataTable,
  ExamplePackageRecentItemsDataTable
} from '../module-data-tables.jsx';

function formatDate(value) {
  return value.toISOString().replace('T', ' ').slice(0, 16);
}

export function parseExamplePackageAdminItemId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function mapTableRows(items) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    priority: item.priority,
    visibilityLabel: item.isPublic ? 'public' : 'private',
    ownerLabel: item.ownerName || item.ownerEmail || '-',
    updatedAt: item.updatedAt.getTime(),
    updatedAtLabel: formatDate(item.updatedAt)
  }));
}

export async function renderExamplePackageAdminHomePage() {
  const [settings, items] = await Promise.all([
    getExamplePackageSettings(),
    listExamplePackageItemsForAdmin(100)
  ]);

  const tableItems = mapTableRows(items);

  return (
    <ModuleLayout
      title="Example Package Admin"
      description="Source-package example with SDK FormBuilder, remote DataTable and module-owned presentation."
    >
      <ModuleCard
        title="Summary"
        description="Runtime module settings and route aliases."
        actions={[
          <ActionLink
            key="create"
            href={`${EXAMPLE_PACKAGE_ADMIN_ALIAS}/create`}
            label="Create Record"
          />,
          <ActionLink
            key="settings"
            href={`${EXAMPLE_PACKAGE_ADMIN_ALIAS}/settings`}
            label="Settings"
          />
        ]}
      >
        <InfoText>Admin alias: {EXAMPLE_PACKAGE_ADMIN_ALIAS}</InfoText>
        <InfoText>Dashboard alias: {EXAMPLE_PACKAGE_DASHBOARD_ALIAS}</InfoText>
        <InfoText>API base: {EXAMPLE_PACKAGE_API_BASE}</InfoText>
        <InfoText>
          Dashboard create: {settings.allowDashboardCreate ? 'enabled' : 'disabled'} |
          API write mode: {settings.apiWriteMode} | Default status:{' '}
          {settings.defaultStatus}
        </InfoText>
      </ModuleCard>

      <ModuleCard
        title="Stored Records"
        description="Remote SDK DataTable backed by mod_example_package_items."
      >
        {tableItems.length === 0 ? (
          <InfoText>No records yet.</InfoText>
        ) : (
          <ExamplePackageAdminItemsDataTable
            items={tableItems}
            adminAlias={EXAMPLE_PACKAGE_ADMIN_ALIAS}
          />
        )}
      </ModuleCard>
    </ModuleLayout>
  );
}

export async function renderExamplePackageAdminCreatePage() {
  const [settings, latestItems] = await Promise.all([
    getExamplePackageSettings(),
    listExamplePackageItemsForAdmin(8)
  ]);
  const recentItems = mapTableRows(latestItems);
  const createForm = composeBuildFormDefinition(
    createExamplePackageAdminItemFormDefinition(),
    {
      request: {
        action: createExamplePackageItemAdminAction,
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
            href: EXAMPLE_PACKAGE_ADMIN_ALIAS
          }
        ]
      },
      values: {
        status: settings.defaultStatus,
        priority: EXAMPLE_PACKAGE_DEFAULT_PRIORITY,
        isPublic: false
      }
    }
  );

  return (
    <ModuleLayout
      title="Create Admin Record"
      description="Uses SDK TemplateBuildForm inside a source-package module."
    >
      <ModuleCard title="Create" description="Validated action with no host imports.">
        <TemplateBuildForm
          definition={createForm}
          area="admin"
          route={`${EXAMPLE_PACKAGE_ADMIN_ALIAS}/create`}
          moduleId="mod.example.package"
          slot="mod.example.package.admin.create.form"
        />
      </ModuleCard>

      <ModuleCard
        title="Recent Local Records"
        description="Local companion DataTable so this module showcases both remote and local table definitions."
      >
        {recentItems.length === 0 ? (
          <InfoText>No records yet.</InfoText>
        ) : (
          <ExamplePackageRecentItemsDataTable items={recentItems} />
        )}
      </ModuleCard>
    </ModuleLayout>
  );
}

export async function renderExamplePackageAdminEditPage(itemId) {
  const item = await getExamplePackageItemById(itemId);
  if (!item) {
    return (
      <ModuleLayout
        title="Record Not Found"
        description={`No record for id ${itemId}.`}
      >
        <ModuleCard title="Missing record">
          <ActionLink href={EXAMPLE_PACKAGE_ADMIN_ALIAS} label="Back to module home" />
        </ModuleCard>
      </ModuleLayout>
    );
  }

  const editForm = composeBuildFormDefinition(
    createExamplePackageAdminEditItemFormDefinition(),
    {
      request: {
        action: updateExamplePackageItemAdminAction,
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
            href: EXAMPLE_PACKAGE_ADMIN_ALIAS
          }
        ]
      },
      values: {
        itemId: item.id,
        title: item.title,
        description: item.description || '',
        status: item.status,
        priority: item.priority,
        isPublic: item.isPublic
      }
    }
  );

  const deleteForm = composeBuildFormDefinition(
    {
      id: `mod.example.package.delete-${item.id}`,
      fields: [
        buildFormField.hidden({
          name: 'itemId',
          defaultValue: item.id
        })
      ]
    },
    {
      request: {
        action: deleteExamplePackageItemAdminAction,
        method: 'post'
      },
      submit: {
        idleLabel: 'Delete',
        pendingLabel: 'Deleting...',
        align: 'start',
        secondaryActions: [
          {
            label: 'Cancel',
            href: EXAMPLE_PACKAGE_ADMIN_ALIAS
          }
        ],
        confirm: {
          title: `Delete record #${item.id}?`,
          description: 'This action permanently removes the record.',
          confirmLabel: 'Delete',
          cancelLabel: 'Keep record',
          triggerVariant: 'outline',
          confirmVariant: 'destructive'
        }
      }
    }
  );

  return (
    <ModuleLayout
      title={`Edit Record #${item.id}`}
      description="Update values in the module-owned table through SDK form actions."
    >
      <ModuleCard title="Edit">
        <TemplateBuildForm
          definition={editForm}
          area="admin"
          route={`${EXAMPLE_PACKAGE_ADMIN_ALIAS}/edit/${item.id}`}
          moduleId="mod.example.package"
          slot="mod.example.package.admin.edit.form"
        />
      </ModuleCard>

      <ModuleCard title="Danger Zone" description="Delete this record permanently.">
        <TemplateBuildForm
          definition={deleteForm}
          area="admin"
          route={`${EXAMPLE_PACKAGE_ADMIN_ALIAS}/edit/${item.id}`}
          moduleId="mod.example.package"
          slot="mod.example.package.admin.delete.form"
        />
      </ModuleCard>
    </ModuleLayout>
  );
}

export async function renderExamplePackageAdminSettingsPage() {
  const settings = await getExamplePackageSettings();
  const baseSettingsForm = createExamplePackageSettingsFormDefinition();
  const settingsForm = composeBuildFormDefinition(baseSettingsForm, {
    request: {
      action: updateExamplePackageSettingsAdminAction,
      method: 'post'
    },
    submit: {
      ...baseSettingsForm.submit,
      secondaryActions: [
        {
          label: 'Back',
          href: EXAMPLE_PACKAGE_ADMIN_ALIAS
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
    <ModuleLayout
      title="Module Settings"
      description="Settings are persisted in mod_example_package_settings."
    >
      <ModuleCard title="Settings" description="One SDK form controls shared runtime behavior.">
        <TemplateBuildForm
          definition={settingsForm}
          area="admin"
          route={`${EXAMPLE_PACKAGE_ADMIN_ALIAS}/settings`}
          moduleId="mod.example.package"
          slot="mod.example.package.admin.settings.form"
        />
      </ModuleCard>
    </ModuleLayout>
  );
}
