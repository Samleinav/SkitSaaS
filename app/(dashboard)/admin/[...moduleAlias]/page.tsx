import { notFound } from 'next/navigation';
import { resolveModulePageByPath } from '@/lib/modules/runtime';
import { requireAdminAccess } from '../guards';

type PageProps = {
  params:
    | { moduleAlias?: string[] }
    | Promise<{ moduleAlias?: string[] }>;
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function AdminModuleAliasPage({
  params,
  searchParams
}: PageProps) {
  await requireAdminAccess();

  const resolvedParams = await Promise.resolve(params);
  const aliasParts = resolvedParams.moduleAlias ?? [];
  const path = `/admin/${aliasParts.join('/')}`;

  const content = await resolveModulePageByPath({
    area: 'admin',
    path,
    searchParams
  });

  if (!content) {
    notFound();
  }

  return content;
}
