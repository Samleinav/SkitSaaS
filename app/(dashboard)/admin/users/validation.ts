import type {
  BuildFormValues
} from '@skitsaas/sdk';
import {
  createBuildFormValidationMessage
} from '@skitsaas/sdk';
import type { AppLocale } from '@/lib/i18n/config';
import { createCoreBuildFormValidationMessageResolver } from '@/lib/forms/validation/catalog';
import { createLocalizedBuildFormInvalidFactory } from '@/lib/forms/validation/server';

const ADMIN_USER_VALIDATION_CATALOG: Record<
  AppLocale,
  Record<string, string>
> = {
  en: {
    'admin.users.validation.self_demote':
      'You cannot demote your own admin account.',
    'admin.users.validation.self_status_change':
      'You cannot suspend or ban your own admin account.',
    'admin.users.validation.self_delete':
      'You cannot delete your own admin account.',
    'admin.users.validation.transfer_user_same_as_target':
      'Transfer user cannot be the same as the deleted user.',
    'admin.users.validation.transfer_user_required':
      'A transfer user is required for owned organizations.',
    'admin.users.validation.transfer_user_inactive':
      'Selected transfer user was not found or is inactive.'
  },
  es: {
    'admin.users.validation.self_demote':
      'No puedes degradar tu propia cuenta de administrador.',
    'admin.users.validation.self_status_change':
      'No puedes suspender ni bloquear tu propia cuenta de administrador.',
    'admin.users.validation.self_delete':
      'No puedes eliminar tu propia cuenta de administrador.',
    'admin.users.validation.transfer_user_same_as_target':
      'El usuario de transferencia no puede ser el mismo usuario eliminado.',
    'admin.users.validation.transfer_user_required':
      'Se requiere un usuario de transferencia para las organizaciones propias.',
    'admin.users.validation.transfer_user_inactive':
      'No se encontro el usuario de transferencia o no esta activo.'
  }
};

export function createAdminUserValidationMessageResolver(locale: AppLocale) {
  return createCoreBuildFormValidationMessageResolver(
    locale,
    ADMIN_USER_VALIDATION_CATALOG
  );
}

export const adminUserValidationMessage = {
  selfDemote() {
    return createBuildFormValidationMessage(
      'admin.users.validation.self_demote',
      'You cannot demote your own admin account.'
    );
  },
  selfStatusChange() {
    return createBuildFormValidationMessage(
      'admin.users.validation.self_status_change',
      'You cannot suspend or ban your own admin account.'
    );
  },
  selfDelete() {
    return createBuildFormValidationMessage(
      'admin.users.validation.self_delete',
      'You cannot delete your own admin account.'
    );
  },
  transferUserSameAsTarget() {
    return createBuildFormValidationMessage(
      'admin.users.validation.transfer_user_same_as_target',
      'Transfer user cannot be the same as the deleted user.'
    );
  },
  transferUserRequired() {
    return createBuildFormValidationMessage(
      'admin.users.validation.transfer_user_required',
      'A transfer user is required for owned organizations.'
    );
  },
  transferUserInactive() {
    return createBuildFormValidationMessage(
      'admin.users.validation.transfer_user_inactive',
      'Selected transfer user was not found or is inactive.'
    );
  }
} as const;

export async function createAdminUserInvalidFactory<
  TValues extends BuildFormValues = BuildFormValues
>(values: TValues) {
  return createLocalizedBuildFormInvalidFactory({
    values,
    createResolver: createAdminUserValidationMessageResolver
  });
}
