import { ThemeFrontendRoute } from '@/components/theme/theme-frontend-route';
import { FrontendModuleSlot } from '@/components/ui/frontend-module-slot';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

export default async function ContactUsPage() {
  const fallbackPage = (
    <main className="relative mx-auto w-full max-w-4xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
      <section className="space-y-4">
        <h1 className="font-[family-name:var(--font-marketing-serif)] text-4xl font-medium text-zinc-100 sm:text-5xl">
          Contact
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          This page renders a frontend slot. If no module provides the slot, the
          core fallback stays active.
        </p>
      </section>

      <section className="mt-8">
        <FrontendModuleSlot
          slotId="frontend.contact.form.primary"
          moduleId="mod.example.dashboard"
          route="/contact-us"
          fallback={
            <div className="marketing-panel rounded-2xl p-6 text-sm text-zinc-300">
              Contact form slot fallback.
            </div>
          }
        />
      </section>
    </main>
  );

  const themeSelection = await getThemeSelectionForArea('frontend');
  if (!themeSelection.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeFrontendRoute
      path="/contact-us"
      themeId={themeSelection.themeKey}
      fallback={fallbackPage}
    />
  );
}
