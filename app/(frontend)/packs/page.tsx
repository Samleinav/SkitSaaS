import { ThemeFrontendRoute } from '@/components/theme/theme-frontend-route';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

export default async function PacksPage() {
  const fallbackPage = (
    <main className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
      <section className="theme-first-frontend-panel rounded-[2rem] p-8 sm:p-10">
        <span className="inline-flex items-center rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-1 text-[11px] font-medium tracking-[0.2em] text-amber-100 uppercase">
          Packs
        </span>
        <h1 className="mt-5 font-[family-name:var(--font-marketing-serif)] text-4xl font-medium leading-tight text-zinc-100 sm:text-5xl">
          Choose how you want to adopt SKSS.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-400">
          This route is rendered by the active frontend theme. If the theme route is
          unavailable, the host keeps a minimal fallback in place.
        </p>
      </section>
    </main>
  );

  const themeSelection = await getThemeSelectionForArea('frontend');
  if (!themeSelection.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeFrontendRoute
      path="/packs"
      themeId={themeSelection.themeKey}
      fallback={fallbackPage}
    />
  );
}
