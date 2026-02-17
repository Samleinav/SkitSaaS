import { type ThemeArea } from '@/lib/theme';
import { THEME_GLOBAL_STYLE_ID } from '@/lib/themes/constants';

export function ThemeGlobalStyle({
  area,
  themeKey,
  globalCss
}: {
  area: ThemeArea;
  themeKey: string | null;
  globalCss: string;
}) {
  const normalizedCss = globalCss.trim();
  if (!normalizedCss) {
    return null;
  }

  return (
    <style
      id={THEME_GLOBAL_STYLE_ID}
      data-theme-pack-area={area}
      data-theme-pack-key={themeKey ?? ''}
      dangerouslySetInnerHTML={{ __html: normalizedCss }}
    />
  );
}

