import { cookies } from 'next/headers';
import type {
  BuildFormValidationMessageResolver,
  BuildFormValues
} from '@skitsaas/sdk';
import type { AppLocale } from '@/lib/i18n/config';
import { LOCALE_COOKIE_NAME, resolveLocale } from '@/lib/i18n/config';
import { createBuildFormInvalidFactory } from '@/lib/forms/validation/results';

export async function getBuildFormRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}

export async function createLocalizedBuildFormInvalidFactory<
  TValues extends BuildFormValues = BuildFormValues
>({
  values,
  createResolver
}: {
  values: TValues;
  createResolver: (locale: AppLocale) => BuildFormValidationMessageResolver;
}) {
  const locale = await getBuildFormRequestLocale();

  return createBuildFormInvalidFactory({
    values,
    resolveMessage: createResolver(locale)
  });
}
