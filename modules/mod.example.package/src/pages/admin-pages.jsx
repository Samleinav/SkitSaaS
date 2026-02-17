import React from 'react';
import {
  EXAMPLE_PACKAGE_ADMIN_ALIAS,
  EXAMPLE_PACKAGE_API_BASE,
  EXAMPLE_PACKAGE_DASHBOARD_ALIAS,
  toPositiveInt
} from '../constants';
import {
  createExamplePackageItemAdminAction,
  deleteExamplePackageItemAdminAction,
  updateExamplePackageItemAdminAction,
  updateExamplePackageSettingsAdminAction
} from '../actions';
import {
  getExamplePackageItemById,
  getExamplePackageSettings,
  listExamplePackageItemsForAdmin
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
  SelectInput,
  SubmitButton,
  TextArea,
  TextInput
} from '../ui/module-ui.jsx';

function formatDate(value) {
  return value.toISOString().replace('T', ' ').slice(0, 16);
}

function statusOptions(defaultValue) {
  return (
    <SelectInput id="status" name="status" defaultValue={defaultValue}>
      <option value="draft">draft</option>
      <option value="active">active</option>
      <option value="archived">archived</option>
    </SelectInput>
  );
}

function visibilityCheckbox(defaultChecked) {
  return (
    <label>
      <input
        type="checkbox"
        name="isPublic"
        value="true"
        defaultChecked={defaultChecked}
      />{' '}
      Public visibility
    </label>
  );
}

export async function renderExamplePackageAdminHomePage() {
  const [settings, items] = await Promise.all([
    getExamplePackageSettings(),
    listExamplePackageItemsForAdmin(100)
  ]);

  const rows = items.map((item) => [
    <code key={`id-${item.id}`}>{item.id}</code>,
    <strong key={`title-${item.id}`}>{item.title}</strong>,
    <Badge key={`status-${item.id}`} value={item.status} />,
    String(item.priority),
    item.isPublic ? 'public' : 'private',
    item.ownerName || item.ownerEmail || '-',
    <code key={`updated-${item.id}`}>{formatDate(item.updatedAt)}</code>,
    <div key={`actions-${item.id}`}>
      <a href={`${EXAMPLE_PACKAGE_ADMIN_ALIAS}/edit/${item.id}`}>Edit</a>{' '}
      <form action={deleteExamplePackageItemAdminAction} style={{ display: 'inline' }}>
        <input type="hidden" name="itemId" value={item.id} />
        <SubmitButton label="Delete" tone="danger" />
      </form>
    </div>
  ]);

  return (
    <ModuleLayout
      title="Example Package Admin"
      description="Full source-package example with module-owned actions, API and DB."
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
        description="Backed by mod_example_package_items."
      >
        {rows.length === 0 ? (
          <InfoText>No records yet.</InfoText>
        ) : (
          <DataTable
            headers={[
              'Id',
              'Title',
              'Status',
              'Priority',
              'Visibility',
              'Owner',
              'Updated',
              'Actions'
            ]}
            rows={rows}
          />
        )}
      </ModuleCard>
    </ModuleLayout>
  );
}

export async function renderExamplePackageAdminCreatePage() {
  const settings = await getExamplePackageSettings();

  return (
    <ModuleLayout
      title="Create Admin Record"
      description="Creates a row in module table using module action."
    >
      <ModuleCard title="Create">
        <form action={createExamplePackageItemAdminAction}>
          <FieldLabel htmlFor="title" label="Title" />
          <TextInput
            id="title"
            name="title"
            required
            maxLength={120}
            placeholder="Campaign launch checklist"
          />

          <FieldLabel htmlFor="description" label="Description" />
          <TextArea
            id="description"
            name="description"
            rows={4}
            placeholder="Optional details for dashboard and API."
          />

          <FieldLabel htmlFor="status" label="Status" />
          {statusOptions(settings.defaultStatus)}

          <FieldLabel htmlFor="priority" label="Priority (1-5)" />
          <TextInput
            id="priority"
            name="priority"
            type="number"
            min={1}
            max={5}
            defaultValue={3}
          />

          {visibilityCheckbox(false)}

          <FormActions>
            <SubmitButton label="Create" />
            <ActionLink href={EXAMPLE_PACKAGE_ADMIN_ALIAS} label="Back" />
          </FormActions>
        </form>
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

  return (
    <ModuleLayout
      title={`Edit Record #${item.id}`}
      description="Update values in module-owned table."
    >
      <ModuleCard title="Edit">
        <form action={updateExamplePackageItemAdminAction}>
          <input type="hidden" name="itemId" value={item.id} />

          <FieldLabel htmlFor="title" label="Title" />
          <TextInput
            id="title"
            name="title"
            required
            maxLength={120}
            defaultValue={item.title}
          />

          <FieldLabel htmlFor="description" label="Description" />
          <TextArea
            id="description"
            name="description"
            rows={4}
            defaultValue={item.description || ''}
          />

          <FieldLabel htmlFor="status" label="Status" />
          {statusOptions(item.status)}

          <FieldLabel htmlFor="priority" label="Priority (1-5)" />
          <TextInput
            id="priority"
            name="priority"
            type="number"
            min={1}
            max={5}
            defaultValue={item.priority}
          />

          {visibilityCheckbox(item.isPublic)}

          <FormActions>
            <SubmitButton label="Save" />
            <ActionLink href={EXAMPLE_PACKAGE_ADMIN_ALIAS} label="Back" />
          </FormActions>
        </form>
      </ModuleCard>

      <ModuleCard title="Danger Zone" description="Delete this record permanently.">
        <form action={deleteExamplePackageItemAdminAction}>
          <input type="hidden" name="itemId" value={item.id} />
          <FormActions>
            <SubmitButton label="Delete" tone="danger" />
            <ActionLink href={EXAMPLE_PACKAGE_ADMIN_ALIAS} label="Cancel" />
          </FormActions>
        </form>
      </ModuleCard>
    </ModuleLayout>
  );
}

export async function renderExamplePackageAdminSettingsPage() {
  const settings = await getExamplePackageSettings();

  return (
    <ModuleLayout
      title="Module Settings"
      description="Settings are persisted in mod_example_package_settings."
    >
      <ModuleCard title="Update Settings">
        <form action={updateExamplePackageSettingsAdminAction}>
          <label>
            <input
              type="checkbox"
              name="allowDashboardCreate"
              value="true"
              defaultChecked={settings.allowDashboardCreate}
            />{' '}
            Allow dashboard users to create records
          </label>

          <FieldLabel htmlFor="apiWriteMode" label="API write mode" />
          <SelectInput
            id="apiWriteMode"
            name="apiWriteMode"
            defaultValue={settings.apiWriteMode}
          >
            <option value="authenticated">authenticated users</option>
            <option value="admin">admins only</option>
          </SelectInput>

          <FieldLabel htmlFor="defaultStatus" label="Default status" />
          <SelectInput
            id="defaultStatus"
            name="defaultStatus"
            defaultValue={settings.defaultStatus}
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="archived">archived</option>
          </SelectInput>

          <FormActions>
            <SubmitButton label="Save Settings" />
            <ActionLink href={EXAMPLE_PACKAGE_ADMIN_ALIAS} label="Back" />
          </FormActions>
        </form>
      </ModuleCard>
    </ModuleLayout>
  );
}

export function parseExamplePackageAdminItemId(value) {
  return toPositiveInt(value);
}
