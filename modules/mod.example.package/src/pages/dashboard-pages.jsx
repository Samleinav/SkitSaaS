import React from 'react';
import { TemplateBuildForm, composeBuildFormDefinition } from '@skitsaas/sdk';
import { getUser } from '@skitsaas/sdk/server';
import { EXAMPLE_PACKAGE_DASHBOARD_ALIAS } from '../constants.js';
import { createExamplePackageItemDashboardAction } from '../actions.js';
import {
  getEditableExamplePackageItemForUser,
  getExamplePackageSettings,
  listExamplePackageItemsForUser
} from '../data.js';
import { createExamplePackageDashboardItemFormDefinition } from '../forms.js';
import {
  ActionLink,
  Badge,
  InfoText,
  ModuleCard,
  ModuleLayout
} from '../ui/module-ui.jsx';
import { ExamplePackageDashboardItemsDataTable } from '../module-data-tables.jsx';

function formatDate(value) {
  return value.toISOString().replace('T', ' ').slice(0, 16);
}

export async function renderExamplePackageDashboardHomePage() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const [settings, items] = await Promise.all([
    getExamplePackageSettings(),
    listExamplePackageItemsForUser({ userId: user.id, limit: 120 })
  ]);

  const tableItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    priority: item.priority,
    visibilityLabel: item.isPublic ? 'public' : 'private',
    updatedAt: item.updatedAt.getTime(),
    updatedAtLabel: formatDate(item.updatedAt)
  }));

  return (
    <ModuleLayout
      title="Example Package Dashboard"
      description="Dashboard view for the source-package example module."
    >
      <ModuleCard title="Visibility">
        <InfoText>Visible records: {items.length}</InfoText>
        <InfoText>
          Dashboard create: {settings.allowDashboardCreate ? 'enabled' : 'disabled'}
        </InfoText>
        {settings.allowDashboardCreate ? (
          <ActionLink
            href={`${EXAMPLE_PACKAGE_DASHBOARD_ALIAS}/create`}
            label="Create Record"
          />
        ) : null}
      </ModuleCard>

      <ModuleCard
        title="Records"
        description="Remote SDK DataTable showing public records and records you own."
      >
        {tableItems.length === 0 ? (
          <InfoText>No records visible.</InfoText>
        ) : (
          <ExamplePackageDashboardItemsDataTable
            items={tableItems}
            dashboardAlias={EXAMPLE_PACKAGE_DASHBOARD_ALIAS}
          />
        )}
      </ModuleCard>
    </ModuleLayout>
  );
}

export async function renderExamplePackageDashboardCreatePage() {
  const [user, settings] = await Promise.all([getUser(), getExamplePackageSettings()]);
  if (!user) {
    return null;
  }

  const createForm = composeBuildFormDefinition(
    createExamplePackageDashboardItemFormDefinition(),
    {
      request: {
        action: createExamplePackageItemDashboardAction,
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
            href: EXAMPLE_PACKAGE_DASHBOARD_ALIAS
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
    <ModuleLayout
      title="Dashboard Create"
      description="Create a module record from dashboard with SDK TemplateBuildForm."
    >
      <ModuleCard title="Create Record">
        {!settings.allowDashboardCreate ? (
          <InfoText>Dashboard create is disabled by module settings.</InfoText>
        ) : (
          <TemplateBuildForm
            definition={createForm}
            area="dashboard"
            route={`${EXAMPLE_PACKAGE_DASHBOARD_ALIAS}/create`}
            moduleId="mod.example.package"
            slot="mod.example.package.dashboard.create.form"
          />
        )}
      </ModuleCard>
    </ModuleLayout>
  );
}

export async function renderExamplePackageDashboardItemPage(itemId) {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const item = await getEditableExamplePackageItemForUser({ itemId, userId: user.id });
  if (!item) {
    return (
      <ModuleLayout
        title="Record Not Available"
        description="The record does not exist or is not owned by your user."
      >
        <ModuleCard title="Unavailable">
          <ActionLink href={EXAMPLE_PACKAGE_DASHBOARD_ALIAS} label="Back to module" />
        </ModuleCard>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout title={item.title} description="Owner-only dashboard detail view.">
      <ModuleCard title={`Record #${item.id}`}>
        <InfoText>
          Status: <Badge value={item.status} />
        </InfoText>
        <InfoText>Priority: {item.priority}</InfoText>
        <InfoText>Visibility: {item.isPublic ? 'public' : 'private'}</InfoText>
        <InfoText>Description: {item.description || '-'}</InfoText>
        <InfoText>Updated: {formatDate(item.updatedAt)}</InfoText>
        <ActionLink href={EXAMPLE_PACKAGE_DASHBOARD_ALIAS} label="Back to module" />
      </ModuleCard>
    </ModuleLayout>
  );
}
