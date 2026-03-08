import type {
  BuildFormDefinition,
  BuildFormHttpMethod,
  BuildFormRequest,
  BuildFormRequestActionFunction
} from '@skitsaas/sdk';
import type { ComposeBuildFormDefinitionOptions } from '@/lib/forms/definition';
import { composeBuildFormDefinition } from '@/lib/forms/definition';
import type { BuildFormAccessScope, BuildFormArea } from '@/lib/forms/security';
import { listBuildFormControllerCatalog } from '@/lib/forms/registry-catalog';
import {
  createUserAction,
  deleteUserAction,
  updateUserAccountStatusAction,
  updateUserProfileAction
} from '@/app/(dashboard)/admin/users/actions';
import { upsertOrganizationControlsAction } from '@/app/(dashboard)/admin/app-config/actions';
import {
  clearTeamSubscriptionAction,
  deleteSubscriptionTemplateAction,
  requestTemplateActiveSubscriptionsUpdateAction,
  updateTeamSubscriptionAction,
  updateUserSubscriptionAction
} from '@/app/(dashboard)/admin/subscriptions/actions';
import {
  cancelUserSubscriptionAction,
  manageOrganizationSubscriptionAction
} from '@/app/(dashboard)/dashboard/subscriptions/actions';
import { updateAccount } from '@/app/(dashboard)/dashboard/general/actions';
import {
  deleteAccount,
  updatePassword
} from '@/app/(dashboard)/dashboard/security/actions';

export type RegisteredBuildFormController = {
  formId: string;
  area: BuildFormArea;
  access: BuildFormAccessScope;
  resolveDefinition: () => BuildFormDefinition | Promise<BuildFormDefinition>;
  submitAction?: BuildFormRequestActionFunction;
  method?: BuildFormHttpMethod;
  route?: string | null;
};

export type RegisteredBuildForm = RegisteredBuildFormController;

const registeredBuildForms = new Map<string, RegisteredBuildFormController>();
let hasBootstrappedBuildForms = false;

function normalizeBuildFormRegistryId(value: string) {
  return value.trim().toLowerCase();
}

export function registerBuildFormController(entry: RegisteredBuildFormController) {
  const formId = normalizeBuildFormRegistryId(entry.formId);
  if (!formId) {
    throw new Error(
      'registerBuildFormController requires a non-empty formId.'
    );
  }

  registeredBuildForms.set(formId, {
    ...entry,
    formId,
    method: entry.method ?? 'post',
    route: entry.route ?? null
  });
}

export const registerBuildForm = registerBuildFormController;

const buildFormControllerSubmitActions: Partial<
  Record<string, BuildFormRequestActionFunction>
> = {
  'admin-create-user-form': createUserAction,
  'admin-edit-user-profile-form': updateUserProfileAction,
  'admin-update-user-status-form': updateUserAccountStatusAction,
  'admin-delete-user-form': deleteUserAction,
  'admin-app-config-general-form': upsertOrganizationControlsAction,
  'admin-update-user-subscription-form': updateUserSubscriptionAction,
  'admin-manage-organization-subscription-form': updateTeamSubscriptionAction,
  'admin-clear-organization-subscription-form': clearTeamSubscriptionAction,
  'admin-request-template-active-update-form':
    requestTemplateActiveSubscriptionsUpdateAction,
  'admin-delete-subscription-template-form': deleteSubscriptionTemplateAction,
  'dashboard-cancel-user-subscription-form': cancelUserSubscriptionAction,
  'dashboard-manage-organization-subscription-form':
    manageOrganizationSubscriptionAction,
  'dashboard-update-account-form': updateAccount,
  'dashboard-update-password-form': updatePassword,
  'dashboard-delete-account-form': deleteAccount
};

function bootstrapBuildFormRegistry() {
  if (hasBootstrappedBuildForms) {
    return;
  }

  for (const entry of listBuildFormControllerCatalog()) {
    registerBuildFormController({
      ...entry,
      submitAction: buildFormControllerSubmitActions[entry.formId]
    });
  }

  hasBootstrappedBuildForms = true;
}

export function resolveRegisteredBuildFormController(formId: string) {
  bootstrapBuildFormRegistry();
  return registeredBuildForms.get(normalizeBuildFormRegistryId(formId)) ?? null;
}

export async function resolveRegisteredBuildForm(formId: string) {
  return resolveRegisteredBuildFormController(formId);
}

export function listRegisteredBuildFormControllers() {
  bootstrapBuildFormRegistry();

  return Array.from(registeredBuildForms.values()).sort((left, right) =>
    left.formId.localeCompare(right.formId)
  );
}

export function listRegisteredBuildFormIds() {
  return listRegisteredBuildFormControllers().map((entry) => entry.formId);
}

export function resolveRegisteredBuildFormRequest(
  formId: string
): BuildFormRequest | null {
  const controller = resolveRegisteredBuildFormController(formId);
  if (!controller?.submitAction) {
    return null;
  }

  return {
    action: controller.submitAction,
    method: controller.method ?? 'post'
  };
}

export function resolveRegisteredBuildFormRequestOrThrow(formId: string) {
  const request = resolveRegisteredBuildFormRequest(formId);
  if (!request) {
    throw new Error(
      `No registered submit action was found for BuildForm "${formId}".`
    );
  }

  return request;
}

export function composeRegisteredBuildFormDefinition<
  TDefinition extends BuildFormDefinition
>(
  formId: string,
  definition: TDefinition,
  options: Omit<ComposeBuildFormDefinitionOptions<TDefinition>, 'request'> & {
    request?: Partial<BuildFormRequest> | null;
  } = {}
) {
  const registeredRequest = resolveRegisteredBuildFormRequestOrThrow(formId);
  const request =
    options.request === null
      ? null
      : {
          ...registeredRequest,
          ...(options.request ?? {})
        };

  return composeBuildFormDefinition(definition, {
    ...options,
    request
  });
}
