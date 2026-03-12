import { notFound, redirect } from 'next/navigation';
import { getAllModuleManifests } from '@/lib/modules/registry';
import { resolveModuleRouteAlias } from '@/lib/modules/routes';
import {
  evaluateFrontendModuleAccess,
  resolveModulePage
} from '@/lib/modules/runtime';
type PageProps = {
  params:
    | { moduleAlias?: string[] }
    | Promise<{ moduleAlias?: string[] }>;
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function FrontendModuleAliasPage({
  params,
  searchParams
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const aliasParts = resolvedParams.moduleAlias ?? [];
  if (!aliasParts.length) {
    notFound();
  }

  const path = `/${aliasParts.join('/')}`;
  const match = resolveModuleRouteAlias({
    area: 'frontend',
    path,
    manifests: getAllModuleManifests()
  });
  if (!match) {
    notFound();
  }

  const access = await evaluateFrontendModuleAccess(match.moduleId);
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
    moduleId: match.moduleId,
    slug: match.slug,
    searchParams
  });

  if (!content) {
    notFound();
  }

  return content;
}
