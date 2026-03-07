import type {
  BuildFormDefinition,
  BuildFormHttpMethod
} from '@skitsaas/sdk';
import type { BuildFormAccessScope, BuildFormArea } from '@/lib/forms/security';
import {
  createAdminCreateUserBuildFormBase,
  createAdminDeleteUserBuildFormBase,
  createAdminEditUserStatusBuildFormBase,
  createAdminEditUserProfileBuildFormBase
} from '@/app/(dashboard)/admin/users/forms';
import {
  createDashboardCancelUserSubscriptionBuildFormBase,
  createDashboardManageOrganizationSubscriptionBuildFormBase
} from '@/app/(dashboard)/dashboard/subscriptions/forms';
import { createDashboardUpdateAccountBuildFormBase } from '@/app/(dashboard)/dashboard/general/forms';
import {
  createDashboardDeleteAccountBuildFormBase,
  createDashboardUpdatePasswordBuildFormBase
} from '@/app/(dashboard)/dashboard/security/forms';

export type BuildFormControllerCatalogEntry = {
  formId: string;
  area: BuildFormArea;
  access: BuildFormAccessScope;
  resolveDefinition: () => BuildFormDefinition | Promise<BuildFormDefinition>;
  method?: BuildFormHttpMethod;
  route?: string | null;
};

const buildFormControllerCatalog: BuildFormControllerCatalogEntry[] = [
  {
    formId: 'admin-create-user-form',
    area: 'admin',
    access: 'admin',
    route: '/admin/users',
    resolveDefinition: () => createAdminCreateUserBuildFormBase()
  },
  {
    formId: 'admin-edit-user-profile-form',
    area: 'admin',
    access: 'admin',
    route: '/admin/users/[userId]',
    resolveDefinition: () => createAdminEditUserProfileBuildFormBase()
  },
  {
    formId: 'admin-update-user-status-form',
    area: 'admin',
    access: 'admin',
    route: '/admin/users/[userId]',
    resolveDefinition: () => createAdminEditUserStatusBuildFormBase()
  },
  {
    formId: 'admin-delete-user-form',
    area: 'admin',
    access: 'admin',
    route: '/admin/users/[userId]',
    resolveDefinition: () => createAdminDeleteUserBuildFormBase()
  },
  {
    formId: 'dashboard-cancel-user-subscription-form',
    area: 'dashboard',
    access: 'user',
    route: '/dashboard/subscriptions',
    resolveDefinition: () => createDashboardCancelUserSubscriptionBuildFormBase()
  },
  {
    formId: 'dashboard-manage-organization-subscription-form',
    area: 'dashboard',
    access: 'user',
    route: '/dashboard/subscriptions',
    resolveDefinition: () =>
      createDashboardManageOrganizationSubscriptionBuildFormBase()
  },
  {
    formId: 'dashboard-update-account-form',
    area: 'dashboard',
    access: 'user',
    route: '/dashboard/general',
    resolveDefinition: () => createDashboardUpdateAccountBuildFormBase()
  },
  {
    formId: 'dashboard-update-password-form',
    area: 'dashboard',
    access: 'user',
    route: '/dashboard/security',
    resolveDefinition: () => createDashboardUpdatePasswordBuildFormBase()
  },
  {
    formId: 'dashboard-delete-account-form',
    area: 'dashboard',
    access: 'user',
    route: '/dashboard/security',
    resolveDefinition: () => createDashboardDeleteAccountBuildFormBase()
  }
];

function normalizeBuildFormRegistryId(value: string) {
  return value.trim().toLowerCase();
}

export function listBuildFormControllerCatalog() {
  return [...buildFormControllerCatalog].sort((left, right) =>
    left.formId.localeCompare(right.formId)
  );
}

export function resolveBuildFormControllerCatalogEntry(formId: string) {
  const normalizedFormId = normalizeBuildFormRegistryId(formId);
  return (
    buildFormControllerCatalog.find((entry) => entry.formId === normalizedFormId) ??
    null
  );
}
