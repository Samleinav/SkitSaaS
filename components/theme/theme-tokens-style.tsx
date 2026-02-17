import { type ThemeArea } from '@/lib/theme';
import { THEME_TOKENS_STYLE_ID } from '@/lib/themes/constants';

export function ThemeTokensStyle({
  area,
  themeKey,
  tokensCss
}: {
  area: ThemeArea;
  themeKey: string | null;
  tokensCss: string;
}) {
  const normalizedCss = tokensCss.trim();
  if (!normalizedCss) {
    return null;
  }

  return (
    <style
      id={THEME_TOKENS_STYLE_ID}
      data-theme-pack-area={area}
      data-theme-pack-key={themeKey ?? ''}
      dangerouslySetInnerHTML={{ __html: normalizedCss }}
    />
  );
}
