'use server';

import {
  createServerActionController,
  revalidatePaths,
  requireAdmin,
  requireUser,
  type FormReader
} from '@skitsaas/sdk/server';
import {
  EXAMPLE_SUITE_ADMIN_ALIAS,
  EXAMPLE_SUITE_DASHBOARD_ALIAS,
  normalizeExampleSuiteApiWriteMode,
  normalizeExampleSuitePriority,
  normalizeExampleSuiteStatus,
  parseCheckboxValue
} from './constants';
import {
  createExampleSuiteItem,
  deleteExampleSuiteItem,
  getExampleSuiteItemById,
  getExampleSuiteSettings,
  updateExampleSuiteItem,
  updateExampleSuiteSettings
} from './data';

type ExampleSuiteSessionUser = {
  id: number;
  role?: string | null;
};

const adminAction = createServerActionController<ExampleSuiteSessionUser>({
  requireUser: async () => requireAdmin<ExampleSuiteSessionUser>()
});

const dashboardAction = createServerActionController<ExampleSuiteSessionUser>({
  requireUser: async () => requireUser<ExampleSuiteSessionUser>()
});

const EXAMPLE_SUITE_ADMIN_REVALIDATE_PATHS = [
  EXAMPLE_SUITE_ADMIN_ALIAS,
  `${EXAMPLE_SUITE_ADMIN_ALIAS}/create`,
  `${EXAMPLE_SUITE_ADMIN_ALIAS}/settings`
];

const EXAMPLE_SUITE_DASHBOARD_REVALIDATE_PATHS = [
  EXAMPLE_SUITE_DASHBOARD_ALIAS,
  `${EXAMPLE_SUITE_DASHBOARD_ALIAS}/create`
];

async function revalidateExampleSuiteRoutes(extraPaths: string[] = []) {
  await revalidatePaths([
    ...EXAMPLE_SUITE_ADMIN_REVALIDATE_PATHS,
    ...EXAMPLE_SUITE_DASHBOARD_REVALIDATE_PATHS,
    ...extraPaths
  ]);
}

function readPositiveInteger(form: FormReader, field: string) {
  return form.positiveInt(field);
}

export const createExampleSuiteItemAdminAction = adminAction(
  async ({ user, form }) => {
    const title = form.string('title');
    if (!title) {
      return false;
    }

    const settings = await getExampleSuiteSettings();
    const status = normalizeExampleSuiteStatus(
      form.lower('status'),
      settings.defaultStatus
    );
    const priority = normalizeExampleSuitePriority(form.integer('priority'));
    const isPublic = parseCheckboxValue(form.value('isPublic'));

    await createExampleSuiteItem({
      title,
      description: form.string('description'),
      status,
      priority,
      isPublic,
      ownerUserId: user.id
    });

    await revalidateExampleSuiteRoutes();
  }
);

export const updateExampleSuiteItemAdminAction = adminAction(async ({ form }) => {
  const itemId = readPositiveInteger(form, 'itemId');
  if (!itemId) {
    return false;
  }

  const existing = await getExampleSuiteItemById(itemId);
  if (!existing) {
    return false;
  }

  const status = normalizeExampleSuiteStatus(
    form.lower('status'),
    normalizeExampleSuiteStatus(existing.status)
  );
  const priority = normalizeExampleSuitePriority(
    form.integer('priority'),
    existing.priority
  );

  await updateExampleSuiteItem(itemId, {
    title: form.string('title'),
    description: form.string('description'),
    status,
    priority,
    isPublic: parseCheckboxValue(form.value('isPublic'))
  });

  await revalidateExampleSuiteRoutes([`${EXAMPLE_SUITE_ADMIN_ALIAS}/edit/${itemId}`]);
});

export const deleteExampleSuiteItemAdminAction = adminAction(async ({ form }) => {
  const itemId = readPositiveInteger(form, 'itemId');
  if (!itemId) {
    return false;
  }

  await deleteExampleSuiteItem(itemId);
  await revalidateExampleSuiteRoutes();
});

export const updateExampleSuiteSettingsAdminAction = adminAction(
  async ({ user, form }) => {
    await updateExampleSuiteSettings({
      allowDashboardCreate: parseCheckboxValue(
        form.value('allowDashboardCreate')
      ),
      apiWriteMode: normalizeExampleSuiteApiWriteMode(
        form.lower('apiWriteMode')
      ),
      defaultStatus: normalizeExampleSuiteStatus(form.lower('defaultStatus')),
      updatedByUserId: user.id
    });

    await revalidateExampleSuiteRoutes();
  }
);

export const createExampleSuiteItemDashboardAction = dashboardAction(
  async ({ user, form }) => {
    const settings = await getExampleSuiteSettings();
    if (!settings.allowDashboardCreate) {
      return false;
    }

    const title = form.string('title');
    if (!title) {
      return false;
    }

    await createExampleSuiteItem({
      title,
      description: form.string('description'),
      status: settings.defaultStatus,
      priority: normalizeExampleSuitePriority(form.integer('priority')),
      isPublic: parseCheckboxValue(form.value('isPublic')),
      ownerUserId: user.id
    });

    await revalidatePaths(EXAMPLE_SUITE_DASHBOARD_REVALIDATE_PATHS);
  }
);
