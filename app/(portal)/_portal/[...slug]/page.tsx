import { notFound } from 'next/navigation';
import { resolvePortalPage } from '@/lib/portals/runtime';

type PageProps = {
  params: { slug?: string[] } | Promise<{ slug?: string[] }>;
  searchParams: Record<string, string | string[] | undefined>;
};

/**
 * Internal portal dispatcher — served at /_portal/[portalName]/[...rest].
 * Never reached directly by users; the middleware rewrites portal paths here
 * so portals are served without the (frontend) marketing layout.
 */
export default async function PortalDispatcherPage({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug ?? [];
  if (!slug.length) notFound();

  const [portalName, ...restSlug] = slug;
  return resolvePortalPage({ portalName, slug: restSlug, searchParams });
}
