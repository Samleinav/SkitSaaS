import '@/lib/modules/sdk-server-bootstrap';
import { notFound, redirect } from 'next/navigation';
import {
  evaluateFrontendModuleAccess,
  resolveModulePage
} from '@/lib/modules/runtime';

type PageProps = {
  params: { moduleId: string; slug?: string[] } | Promise<{ moduleId: string; slug?: string[] }>;
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function FrontendModulePage({
  params,
  searchParams
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const access = await evaluateFrontendModuleAccess(resolvedParams.moduleId);
  if (access === 'login_required') {
    redirect('/login');
  }
  if (access === 'forbidden') {
    redirect('/dashboard');
  }
  if (access === 'manifest_missing') {
    notFound();
  }

  const content = await resolveModulePage({
    area: 'frontend',
    moduleId: resolvedParams.moduleId,
    slug: resolvedParams.slug,
    searchParams
  });

  if (!content) {
    notFound();
  }

  return content;
}
