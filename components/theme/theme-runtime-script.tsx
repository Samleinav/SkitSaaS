import {
  buildThemeRuntimeScript,
  getThemeRuntimeSelections
} from '@/lib/theme-runtime';

export async function ThemeRuntimeScript() {
  const selections = await getThemeRuntimeSelections();
  const script = buildThemeRuntimeScript(selections);

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
