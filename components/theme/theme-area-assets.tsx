import type { ThemeArea } from '@/lib/theme';

function buildStableAssetKey(parts: string[]) {
  return parts.join('::');
}

function buildCssPrecedence({
  area,
  themeId,
  index
}: {
  area: ThemeArea;
  themeId: string | null;
  index: number;
}) {
  return buildStableAssetKey(['theme-css', area, themeId ?? 'none', String(index)]);
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
      {cssHrefs.map((href, index) => (
        <link
          key={buildStableAssetKey(['css-link', area, themeId ?? 'none', String(index), href])}
          rel="stylesheet"
          href={href}
          precedence={buildCssPrecedence({ area, themeId, index })}
          data-theme-asset-kind="css"
          data-theme-asset-area={area}
          data-theme-asset-theme={themeId ?? ''}
        />
      ))}
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
