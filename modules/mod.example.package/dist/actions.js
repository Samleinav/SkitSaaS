'use server';

import {
  buildFormValidationMessage,
  createBuildFormValidationResultFromFieldMessages
} from '@skitsaas/sdk';
import {
  createServerActionController,
  createValidatedServerActionController,
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
  toPositiveInt
} from './constants.js';
import {
  createExamplePackageItem,
  deleteExamplePackageItem,
  getExamplePackageItemById,
  getExamplePackageSettings,
  updateExamplePackageItem,
  updateExamplePackageSettings
} from './data.js';
import {
  createExamplePackageAdminEditItemFormDefinition,
  createExamplePackageAdminItemFormDefinition,
  createExamplePackageDashboardItemFormDefinition,
  createExamplePackageSettingsFormDefinition
} from './forms.js';

const adminAction = createServerActionController({
  requireUser: async () => requireAdmin()
});

const adminValidatedAction = createValidatedServerActionController({
  requireUser: async () => requireAdmin()
});

const dashboardValidatedAction = createValidatedServerActionController({
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

function invalidExamplePackageForm(values, fieldMessages, formMessage) {
  return createBuildFormValidationResultFromFieldMessages({
    values,
    fieldMessages,
    formMessage: formMessage ?? null,
    source: 'server'
  });
}

export const createExamplePackageItemAdminAction = adminValidatedAction(
  createExamplePackageAdminItemFormDefinition(),
  async ({ user, values }) => {
    const settings = await getExamplePackageSettings();
    await createExamplePackageItem({
      title: typeof values.title === 'string' ? values.title : '',
      description: typeof values.description === 'string' ? values.description : '',
      status: normalizeExamplePackageStatus(
        typeof values.status === 'string' ? values.status : '',
        settings.defaultStatus
      ),
      priority: normalizeExamplePackagePriority(
        typeof values.priority === 'number' ? values.priority : null
      ),
      isPublic: values.isPublic === true,
      ownerUserId: user.id
    });

    await revalidatePackageRoutes();
  }
);

export const updateExamplePackageItemAdminAction = adminValidatedAction(
  createExamplePackageAdminEditItemFormDefinition(),
  async ({ values }) => {
    const itemId =
      typeof values.itemId === 'number' && Number.isInteger(values.itemId)
        ? values.itemId
        : null;
    if (!itemId) {
      return invalidExamplePackageForm(values, {
        itemId: [buildFormValidationMessage.positiveInteger('Item id')]
      });
    }

    const existing = await getExamplePackageItemById(itemId);
    if (!existing) {
      return invalidExamplePackageForm(values, {
        itemId: [buildFormValidationMessage.recordNotFound('Item')]
      });
    }

    await updateExamplePackageItem(itemId, {
      title: typeof values.title === 'string' ? values.title : '',
      description: typeof values.description === 'string' ? values.description : '',
      status: normalizeExamplePackageStatus(
        typeof values.status === 'string' ? values.status : '',
        existing.status
      ),
      priority: normalizeExamplePackagePriority(
        typeof values.priority === 'number' ? values.priority : null,
        existing.priority
      ),
      isPublic: values.isPublic === true
    });

    await revalidatePackageRoutes([`${EXAMPLE_PACKAGE_ADMIN_ALIAS}/edit/${itemId}`]);
  }
);

export const deleteExamplePackageItemAdminAction = adminAction(async ({ form }) => {
  const itemId = toPositiveInt(form.value('itemId'));
  if (!itemId) {
    return false;
  }

  await deleteExamplePackageItem(itemId);
  await revalidatePackageRoutes();
});

export const updateExamplePackageSettingsAdminAction = adminValidatedAction(
  createExamplePackageSettingsFormDefinition(),
  async ({ user, values }) => {
    await updateExamplePackageSettings({
      allowDashboardCreate: values.allowDashboardCreate === true,
      apiWriteMode: normalizeExamplePackageApiWriteMode(
        typeof values.apiWriteMode === 'string' ? values.apiWriteMode : ''
      ),
      defaultStatus: normalizeExamplePackageStatus(
        typeof values.defaultStatus === 'string' ? values.defaultStatus : ''
      ),
      updatedByUserId: user.id
    });

    await revalidatePackageRoutes();
  }
);

export const createExamplePackageItemDashboardAction = dashboardValidatedAction(
  createExamplePackageDashboardItemFormDefinition(),
  async ({ user, values }) => {
    const settings = await getExamplePackageSettings();
    if (!settings.allowDashboardCreate) {
      return invalidExamplePackageForm(
        values,
        {},
        'Dashboard create is disabled by module settings.'
      );
    }

    await createExamplePackageItem({
      title: typeof values.title === 'string' ? values.title : '',
      description: typeof values.description === 'string' ? values.description : '',
      status: settings.defaultStatus,
      priority: normalizeExamplePackagePriority(
        typeof values.priority === 'number' ? values.priority : null
      ),
      isPublic: values.isPublic === true,
      ownerUserId: user.id
    });

    await revalidatePaths(PACKAGE_DASHBOARD_REVALIDATE_PATHS);
  }
);
