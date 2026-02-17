import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { resolveModulePageByPath } from '@/lib/modules/runtime';

type PageProps = {
  params:
    | { moduleAlias?: string[] }
    | Promise<{ moduleAlias?: string[] }>;
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function DashboardModuleAliasPage({
  params,
  searchParams
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const aliasParts = resolvedParams.moduleAlias ?? [];
  const path = `/dashboard/${aliasParts.join('/')}`;

  const content = await resolveModulePageByPath({
    area: 'dashboard',
    path,
    searchParams
  });

  if (!content) {
    notFound();
  }

  return content;
}
