import fs from 'node:fs';
import path from 'node:path';
import type { ThemeArea } from '@/lib/theme';

function buildStableAssetKey(parts: string[]) {
  return parts.join('::');
}

const inlineCssByHrefCache = new Map<string, string | null>();

function toAbsolutePublicPath(href: string) {
  const normalizedHref = String(href).trim();
  if (!normalizedHref.startsWith('/')) {
    return null;
  }

  const publicDir = path.resolve(process.cwd(), 'public');
  const absolutePath = path.resolve(publicDir, normalizedHref.slice(1));
  const relativeToPublic = path.relative(publicDir, absolutePath);
  if (relativeToPublic.startsWith('..') || path.isAbsolute(relativeToPublic)) {
    return null;
  }

  return absolutePath;
}

function readInlineCssByHref(href: string) {
  if (inlineCssByHrefCache.has(href)) {
    return inlineCssByHrefCache.get(href) ?? null;
  }

  const absolutePath = toAbsolutePublicPath(href);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    inlineCssByHrefCache.set(href, null);
    return null;
  }

  try {
    const css = fs.readFileSync(absolutePath, 'utf8');
    inlineCssByHrefCache.set(href, css);
    return css;
  } catch {
    inlineCssByHrefCache.set(href, null);
    return null;
  }
}

function normalizeInlineCss(css: string) {
  // Prevent accidental early </style> close if any third-party CSS contains it.
  return css.replace(/<\/style/gi, '<\\/style');
}

export function ThemeAreaAssets({
  area,
  themeId,
  cssHrefs,
  scriptHrefs
}: {
  area: ThemeArea;
  themeId: string | null;
  cssHrefs: string[];
  scriptHrefs: string[];
}) {
  return (
    <>
      {cssHrefs.map((href, index) => {
        const inlineCss = readInlineCssByHref(href);
        if (!inlineCss) {
          return (
            <link
              key={buildStableAssetKey(['css-link', area, themeId ?? 'none', String(index), href])}
              rel="stylesheet"
              href={href}
              data-theme-asset-kind="css"
              data-theme-asset-area={area}
              data-theme-asset-theme={themeId ?? ''}
            />
          );
        }

        return (
          <style
            key={buildStableAssetKey(['css-inline', area, themeId ?? 'none', String(index), href])}
            data-theme-asset-kind="css-inline"
            data-theme-asset-area={area}
            data-theme-asset-theme={themeId ?? ''}
            data-theme-asset-href={href}
            dangerouslySetInnerHTML={{ __html: normalizeInlineCss(inlineCss) }}
          />
        );
      })}
      {scriptHrefs.map((href, index) => (
        <script
          key={buildStableAssetKey(['js', area, themeId ?? 'none', String(index), href])}
          src={href}
          defer
          data-theme-asset-kind="js"
          data-theme-asset-area={area}
          data-theme-asset-theme={themeId ?? ''}
        />
      ))}
    </>
  );
}
