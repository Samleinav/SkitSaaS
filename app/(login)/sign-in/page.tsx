import { notFound, redirect } from 'next/navigation';
import { isDashboardEnabled } from '@/lib/config/runtime-surface';

type LegacySignInPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export default async function LegacySignInPage({
  searchParams
}: LegacySignInPageProps) {
  if (!isDashboardEnabled()) {
    notFound();
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const redirectParam = getFirstSearchParam(resolvedSearchParams.redirect);
  const templateIdParam = getFirstSearchParam(resolvedSearchParams.templateId);
  const inviteIdParam = getFirstSearchParam(resolvedSearchParams.inviteId);

  const params = new URLSearchParams();
  if (redirectParam) {
    params.set('redirect', redirectParam);
  }
  if (templateIdParam) {
    params.set('templateId', templateIdParam);
  }
  if (inviteIdParam) {
    params.set('inviteId', inviteIdParam);
  }

  const target = params.size > 0 ? `/login?${params.toString()}` : '/login';
  redirect(target);
}
