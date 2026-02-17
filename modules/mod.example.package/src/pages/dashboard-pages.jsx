import React from 'react';
import { getUser } from '@skitsaas/sdk/server';
import { EXAMPLE_PACKAGE_DASHBOARD_ALIAS } from '../constants';
import { createExamplePackageItemDashboardAction } from '../actions';
import {
  getEditableExamplePackageItemForUser,
  getExamplePackageSettings,
  listExamplePackageItemsForUser
} from '../data';
import {
  ActionLink,
  Badge,
  DataTable,
  FieldLabel,
  FormActions,
  InfoText,
  ModuleCard,
  ModuleLayout,
  SubmitButton,
  TextArea,
  TextInput
} from '../ui/module-ui.jsx';

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

  const rows = items.map((item) => [
    <code key={`id-${item.id}`}>{item.id}</code>,
    <a key={`title-${item.id}`} href={`${EXAMPLE_PACKAGE_DASHBOARD_ALIAS}/items/${item.id}`}>
      {item.title}
    </a>,
    <Badge key={`status-${item.id}`} value={item.status} />,
    String(item.priority),
    item.isPublic ? 'public' : 'private',
    <code key={`updated-${item.id}`}>{formatDate(item.updatedAt)}</code>
  ]);

  return (
    <ModuleLayout
      title="Example Package Dashboard"
      description="Dashboard view for source-package module."
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
        description="Shows public records and records you own."
      >
        {rows.length === 0 ? (
          <InfoText>No records visible.</InfoText>
        ) : (
          <DataTable
            headers={['Id', 'Title', 'Status', 'Priority', 'Visibility', 'Updated']}
            rows={rows}
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

  return (
    <ModuleLayout
      title="Dashboard Create"
      description="Create a module record from dashboard."
    >
      <ModuleCard title="Create Record">
        {!settings.allowDashboardCreate ? (
          <InfoText>Dashboard create is disabled by module settings.</InfoText>
        ) : (
          <form action={createExamplePackageItemDashboardAction}>
            <FieldLabel htmlFor="title" label="Title" />
            <TextInput id="title" name="title" required maxLength={120} />

            <FieldLabel htmlFor="description" label="Description" />
            <TextArea id="description" name="description" rows={3} />

            <FieldLabel htmlFor="priority" label="Priority (1-5)" />
            <TextInput
              id="priority"
              name="priority"
              type="number"
              min={1}
              max={5}
              defaultValue={3}
            />

            <label>
              <input type="checkbox" name="isPublic" value="true" /> Publish to public API
              list
            </label>

            <FormActions>
              <SubmitButton label="Create" />
              <ActionLink href={EXAMPLE_PACKAGE_DASHBOARD_ALIAS} label="Back" />
            </FormActions>
          </form>
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
