'use server';

import {
  createServerActionController,
  revalidatePaths,
  requireAdmin,
  requireUser
} from '@skitsaas/sdk/server';
import {
  EXAMPLE_PACKAGE_ADMIN_ALIAS,
  EXAMPLE_PACKAGE_DASHBOARD_ALIAS,
  normalizeExamplePackageApiWriteMode,
  normalizeExamplePackagePriority,
  normalizeExamplePackageStatus,
  parseCheckboxValue,
  toPositiveInt
} from './constants';
import {
  createExamplePackageItem,
  deleteExamplePackageItem,
  getExamplePackageItemById,
  getExamplePackageSettings,
  updateExamplePackageItem,
  updateExamplePackageSettings
} from './data';

const adminAction = createServerActionController({
  requireUser: async () => requireAdmin()
});

const dashboardAction = createServerActionController({
  requireUser: async () => requireUser()
});

const PACKAGE_ADMIN_REVALIDATE_PATHS = [
  EXAMPLE_PACKAGE_ADMIN_ALIAS,
  `${EXAMPLE_PACKAGE_ADMIN_ALIAS}/create`,
  `${EXAMPLE_PACKAGE_ADMIN_ALIAS}/settings`
];

const PACKAGE_DASHBOARD_REVALIDATE_PATHS = [
  EXAMPLE_PACKAGE_DASHBOARD_ALIAS,
  `${EXAMPLE_PACKAGE_DASHBOARD_ALIAS}/create`
];

async function revalidatePackageRoutes(extraPaths = []) {
  await revalidatePaths([
    ...PACKAGE_ADMIN_REVALIDATE_PATHS,
    ...PACKAGE_DASHBOARD_REVALIDATE_PATHS,
    ...extraPaths
  ]);
}

export const createExamplePackageItemAdminAction = adminAction(
  async ({ user, form }) => {
    const title = form.string('title');
    if (!title) {
      return false;
    }

    const settings = await getExamplePackageSettings();
    await createExamplePackageItem({
      title,
      description: form.string('description'),
      status: normalizeExamplePackageStatus(
        form.lower('status'),
        settings.defaultStatus
      ),
      priority: normalizeExamplePackagePriority(form.integer('priority')),
      isPublic: parseCheckboxValue(form.value('isPublic')),
      ownerUserId: user.id
    });

    await revalidatePackageRoutes();
  }
);

export const updateExamplePackageItemAdminAction = adminAction(async ({ form }) => {
  const itemId = toPositiveInt(form.value('itemId'));
  if (!itemId) {
    return false;
  }

  const existing = await getExamplePackageItemById(itemId);
  if (!existing) {
    return false;
  }

  await updateExamplePackageItem(itemId, {
    title: form.string('title'),
    description: form.string('description'),
    status: normalizeExamplePackageStatus(form.lower('status'), existing.status),
    priority: normalizeExamplePackagePriority(form.integer('priority'), existing.priority),
    isPublic: parseCheckboxValue(form.value('isPublic'))
  });

  await revalidatePackageRoutes([`${EXAMPLE_PACKAGE_ADMIN_ALIAS}/edit/${itemId}`]);
});

export const deleteExamplePackageItemAdminAction = adminAction(async ({ form }) => {
  const itemId = toPositiveInt(form.value('itemId'));
  if (!itemId) {
    return false;
  }

  await deleteExamplePackageItem(itemId);
  await revalidatePackageRoutes();
});

export const updateExamplePackageSettingsAdminAction = adminAction(
  async ({ user, form }) => {
    await updateExamplePackageSettings({
      allowDashboardCreate: parseCheckboxValue(form.value('allowDashboardCreate')),
      apiWriteMode: normalizeExamplePackageApiWriteMode(form.lower('apiWriteMode')),
      defaultStatus: normalizeExamplePackageStatus(form.lower('defaultStatus')),
      updatedByUserId: user.id
    });

    await revalidatePackageRoutes();
  }
);

export const createExamplePackageItemDashboardAction = dashboardAction(
  async ({ user, form }) => {
    const settings = await getExamplePackageSettings();
    if (!settings.allowDashboardCreate) {
      return false;
    }

    const title = form.string('title');
    if (!title) {
      return false;
    }

    await createExamplePackageItem({
      title,
      description: form.string('description'),
      status: settings.defaultStatus,
      priority: normalizeExamplePackagePriority(form.integer('priority')),
      isPublic: parseCheckboxValue(form.value('isPublic')),
      ownerUserId: user.id
    });

    await revalidatePaths(PACKAGE_DASHBOARD_REVALIDATE_PATHS);
  }
);
