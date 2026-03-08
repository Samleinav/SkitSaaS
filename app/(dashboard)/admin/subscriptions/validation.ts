import type { BuildFormValues } from '@skitsaas/sdk';
import { buildFormValidationMessage } from '@skitsaas/sdk';
import { createCoreBuildFormValidationMessageResolver } from '@/lib/forms/validation/catalog';
import { createLocalizedBuildFormInvalidFactory } from '@/lib/forms/validation/server';

export const adminSubscriptionValidationMessage = {
  userNotFound(label = 'User') {
    return buildFormValidationMessage.recordNotFound(label);
  },
  teamNotFound(label = 'Organization') {
    return buildFormValidationMessage.recordNotFound(label);
  },
  templateNotFound(label = 'Template') {
    return buildFormValidationMessage.recordNotFound(label);
  }
} as const;

export async function createAdminSubscriptionInvalidFactory<
  TValues extends BuildFormValues = BuildFormValues
>(values: TValues) {
  return createLocalizedBuildFormInvalidFactory({
    values,
    createResolver: (locale) => createCoreBuildFormValidationMessageResolver(locale)
  });
}
