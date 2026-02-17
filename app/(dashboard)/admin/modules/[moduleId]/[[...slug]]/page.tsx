import { notFound } from 'next/navigation';
import { resolveModulePage } from '@/lib/modules/runtime';
import { requireAdminAccess } from '../../../guards';

type PageProps = {
  params: { moduleId: string; slug?: string[] } | Promise<{ moduleId: string; slug?: string[] }>;
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function AdminModulePage({
  params,
  searchParams
}: PageProps) {
  await requireAdminAccess();
  const resolvedParams = await Promise.resolve(params);

  const content = await resolveModulePage({
    area: 'admin',
    moduleId: resolvedParams.moduleId,
    slug: resolvedParams.slug,
    searchParams
  });

  if (!content) {
    notFound();
  }

  return content;
}
