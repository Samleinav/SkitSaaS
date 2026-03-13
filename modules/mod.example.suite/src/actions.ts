'use server';

import {
  buildFormValidationMessage,
  createBuildFormValidationResultFromFieldMessages,
  type BuildFormValidationMessageInput,
  type BuildFormValues
} from '@skitsaas/sdk';
import {
  createServerActionController,
  createValidatedServerActionController,
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
  normalizeExampleSuiteStatus
} from './constants';
import {
  createExampleSuiteItem,
  deleteExampleSuiteItem,
  getExampleSuiteItemById,
  getExampleSuiteSettings,
  updateExampleSuiteItem,
  updateExampleSuiteSettings
} from './data';
import {
  createExampleSuiteAdminEditItemFormDefinition,
  createExampleSuiteAdminItemFormDefinition,
  createExampleSuiteDashboardItemFormDefinition,
  createExampleSuiteSettingsFormDefinition
} from './forms';

type ExampleSuiteSessionUser = {
  id: number;
  role?: string | null;
};

const adminAction = createServerActionController<ExampleSuiteSessionUser>({
  requireUser: async () => requireAdmin<ExampleSuiteSessionUser>()
});

const adminValidatedAction =
  createValidatedServerActionController<ExampleSuiteSessionUser>({
    requireUser: async () => requireAdmin<ExampleSuiteSessionUser>()
  });

const dashboardValidatedAction =
  createValidatedServerActionController<ExampleSuiteSessionUser>({
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

function invalidExampleSuiteForm(
  values: BuildFormValues,
  fieldMessages: Record<
    string,
    BuildFormValidationMessageInput | BuildFormValidationMessageInput[]
  >,
  formMessage?: string
) {
  return createBuildFormValidationResultFromFieldMessages({
    values,
    fieldMessages,
    formMessage: formMessage ?? null,
    source: 'server'
  });
}

export const createExampleSuiteItemAdminAction = adminValidatedAction(
  createExampleSuiteAdminItemFormDefinition(),
  async ({ user, values }) => {
    const settings = await getExampleSuiteSettings();
    const status = normalizeExampleSuiteStatus(
      typeof values.status === 'string' ? values.status : '',
      settings.defaultStatus
    );
    const priority = normalizeExampleSuitePriority(
      typeof values.priority === 'number' ? values.priority : null
    );
    const isPublic = values.isPublic === true;

    await createExampleSuiteItem({
      title: typeof values.title === 'string' ? values.title : '',
      description: typeof values.description === 'string' ? values.description : '',
      status,
      priority,
      isPublic,
      ownerUserId: user.id
    });
  },
  {
    revalidate: () => revalidateExampleSuiteRoutes()
  }
);

export const updateExampleSuiteItemAdminAction = adminValidatedAction(
  createExampleSuiteAdminEditItemFormDefinition(),
  async ({ values }) => {
    const itemId =
      typeof values.itemId === 'number' && Number.isInteger(values.itemId)
        ? values.itemId
        : null;

    if (!itemId) {
      return invalidExampleSuiteForm(values, {
        itemId: [buildFormValidationMessage.positiveInteger('Item id')]
      });
    }

    const existing = await getExampleSuiteItemById(itemId);
    if (!existing) {
      return invalidExampleSuiteForm(values, {
        itemId: [buildFormValidationMessage.recordNotFound('Item')]
      });
    }

    const status = normalizeExampleSuiteStatus(
      typeof values.status === 'string' ? values.status : '',
      normalizeExampleSuiteStatus(existing.status)
    );
    const priority = normalizeExampleSuitePriority(
      typeof values.priority === 'number' ? values.priority : null,
      existing.priority
    );

    await updateExampleSuiteItem(itemId, {
      title: typeof values.title === 'string' ? values.title : '',
      description: typeof values.description === 'string' ? values.description : '',
      status,
      priority,
      isPublic: values.isPublic === true
    });

    await revalidateExampleSuiteRoutes([`${EXAMPLE_SUITE_ADMIN_ALIAS}/edit/${itemId}`]);
  }
);

export const deleteExampleSuiteItemAdminAction = adminAction(async ({ form }) => {
  const itemId = readPositiveInteger(form, 'itemId');
  if (!itemId) {
    return false;
  }

  await deleteExampleSuiteItem(itemId);
  await revalidateExampleSuiteRoutes();
});

export const updateExampleSuiteSettingsAdminAction = adminValidatedAction(
  createExampleSuiteSettingsFormDefinition(),
  async ({ user, values }) => {
    await updateExampleSuiteSettings({
      allowDashboardCreate: values.allowDashboardCreate === true,
      apiWriteMode: normalizeExampleSuiteApiWriteMode(
        typeof values.apiWriteMode === 'string' ? values.apiWriteMode : ''
      ),
      defaultStatus: normalizeExampleSuiteStatus(
        typeof values.defaultStatus === 'string' ? values.defaultStatus : ''
      ),
      updatedByUserId: user.id
    });
  },
  {
    revalidate: () => revalidateExampleSuiteRoutes()
  }
);

export const createExampleSuiteItemDashboardAction = dashboardValidatedAction(
  createExampleSuiteDashboardItemFormDefinition(),
  async ({ user, values }) => {
    const settings = await getExampleSuiteSettings();
    if (!settings.allowDashboardCreate) {
      return invalidExampleSuiteForm(
        values,
        {},
        'Dashboard create is disabled by module settings.'
      );
    }

    await createExampleSuiteItem({
      title: typeof values.title === 'string' ? values.title : '',
      description: typeof values.description === 'string' ? values.description : '',
      status: settings.defaultStatus,
      priority: normalizeExampleSuitePriority(
        typeof values.priority === 'number' ? values.priority : null
      ),
      isPublic: values.isPublic === true,
      ownerUserId: user.id
    });

    await revalidatePaths(EXAMPLE_SUITE_DASHBOARD_REVALIDATE_PATHS);
  }
);
