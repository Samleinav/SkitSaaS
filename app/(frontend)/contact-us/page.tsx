import { ThemeFrontendRoute } from '@/components/theme/theme-frontend-route';
import { FrontendModuleSlot } from '@/components/ui/frontend-module-slot';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

export default async function ContactUsPage() {
  const fallbackPage = (
    <main className="relative mx-auto w-full max-w-4xl px-4 pb-16 pt-14 sm:px-6 lg:px-8">
      <section className="space-y-4">
        <h1 className="font-[family-name:var(--font-marketing-serif)] text-4xl font-medium text-zinc-100 sm:text-5xl">
          Contact us
        </h1>
        <p className="max-w-2xl text-sm text-zinc-400">
          Send your message and we will get back to you as soon as possible. If
          the contact module is unavailable, this fallback stays visible.
        </p>
      </section>

      <section className="mt-8">
        <FrontendModuleSlot
          slotId="frontend.contact.form.primary"
          moduleId="mod.contact"
          route="/contact-us"
          fallback={
            <div className="marketing-panel rounded-2xl p-6 text-sm text-zinc-300">
              Contact form unavailable right now.
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
