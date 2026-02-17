import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { resolveModulePage } from '@/lib/modules/runtime';

type PageProps = {
  params: { moduleId: string; slug?: string[] } | Promise<{ moduleId: string; slug?: string[] }>;
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function DashboardModulePage({
  params,
  searchParams
}: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const content = await resolveModulePage({
    area: 'dashboard',
    moduleId: resolvedParams.moduleId,
    slug: resolvedParams.slug,
    searchParams
  });

  if (!content) {
    notFound();
  }

  return content;
}
