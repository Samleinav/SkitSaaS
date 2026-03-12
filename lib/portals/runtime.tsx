// Bootstrap: ensures all portal page registrations are loaded in the Node.js server context.
// Modules add their portal-init.ts imports to this file.
import '@/lib/portals/all-portals';

import { notFound } from 'next/navigation';
import { getPortalMeta, getPortalPages } from '@skitsaas/sdk';
import type { ComponentType } from 'react';

type PortalPageEntry = {
  pathPattern: string;
  component: () => Promise<{ default: ComponentType<any> }>;
};

/**
 * Resolves and renders a portal page for the given portalName + slug.
 * Called from the [...moduleAlias] catch-all dispatcher when a portal name is detected.
 *
 * - If the portal has `userTheme`, loads that theme's CSS via ThemeAreaAssets.
 * - If the portal has no theme (`userTheme: false`), injects the raw `head.css` / `head.js` list.
 * - The portal layout handles its own structure (no ThemeRuntimeProvider imposed by default).
 */
export async function resolvePortalPage({
  portalName,
  slug,
  searchParams,
}: {
  portalName: string;
  slug: string[];
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<React.ReactNode> {
  const meta = getPortalMeta(portalName);
  if (!meta) return notFound();

  const slugPath = slug.length ? `/${slug.join('/')}` : '';
  const requestedPath = `/${portalName}${slugPath}`;

  const pages = getPortalPages(portalName);
  const matched = matchPortalPage(pages, requestedPath);
  if (!matched) return notFound();

  const [{ default: Page }, { default: Layout }] = await Promise.all([
    matched.entry.component(),
    meta.layout(),
  ]);

  const portalCtx = {
    name: portalName,
    area: meta.configs[0]?.area,
    context: meta.configs[0]?.context,
    userTheme: meta.userTheme,
  };

  const pageNode = (
    <Page slug={slug} params={matched.params} searchParams={searchParams} />
  );
  const wrapped = <Layout portalCtx={portalCtx}>{pageNode}</Layout>;

  if (meta.userTheme) {
    const { resolveAreaAssetHrefsBySelection } = await import('@/lib/themes/assets');
    const { ThemeAreaAssets } = await import('@/components/theme/theme-area-assets');
    const areaAssets = resolveAreaAssetHrefsBySelection({
      themeId: meta.userTheme,
      area: 'frontend',
    });
    return (
      <>
        <ThemeAreaAssets
          area="frontend"
          themeId={meta.userTheme}
          cssHrefs={areaAssets.cssHrefs}
          scriptHrefs={areaAssets.scriptHrefs}
        />
        {wrapped}
      </>
    );
  }

  // No theme — inject raw head assets and render layout
  const headCss = meta.head?.css ?? [];
  const headJs = meta.head?.js ?? [];

  return (
    <>
      {headCss.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {headJs.map((src) => (
        <script key={src} src={src} defer />
      ))}
      {wrapped}
    </>
  );
}

// ---------------------------------------------------------------------------
// Pattern matching — supports {param} dynamic segments
// ---------------------------------------------------------------------------

function matchPortalPage(
  pages: PortalPageEntry[],
  requestedPath: string
): { entry: PortalPageEntry; params: Record<string, string> } | null {
  for (const entry of pages) {
    const params = matchPattern(entry.pathPattern, requestedPath);
    if (params !== null) return { entry, params };
  }
  return null;
}

function matchPattern(
  pattern: string,
  path: string
): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    if (p.startsWith('{') && p.endsWith('}')) {
      params[p.slice(1, -1)] = pathParts[i];
    } else if (p !== pathParts[i]) {
      return null;
    }
  }
  return params;
}
