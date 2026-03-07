import type { BuildFormValues } from '@skitsaas/sdk';
import { createLocalizedBuildFormInvalidFactory } from '@/lib/forms/validation/server';
import { createDashboardSubscriptionValidationMessageResolver } from './validation-messages';

export async function createDashboardSubscriptionInvalidFactory<
  TValues extends BuildFormValues = BuildFormValues
>(values: TValues) {
  return createLocalizedBuildFormInvalidFactory({
    values,
    createResolver: createDashboardSubscriptionValidationMessageResolver
  });
}
