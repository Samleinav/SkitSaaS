'use client';

import { useI18n } from '@skitsaas/sdk';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
};

export default function SystemNotFoundTemplate({
  className,
  themeId
}: TemplateProps) {
  const t = useI18n({ themeId, area: 'frontend' });

  return (
    <main
      className={className || 'mx-auto max-w-3xl px-4 py-20'}
      data-theme-template="system.not-found"
    >
      <section className="theme-first-frontend-panel rounded-2xl p-8 text-center">
        <p className="text-xs tracking-[0.2em] uppercase opacity-70">404</p>
        <h1 className="mt-2 text-3xl font-semibold">{t('Page not found')}</h1>
        <p className="mt-3 text-sm opacity-80">
          {t('This route does not exist in the active frontend theme.')}
        </p>
      </section>
    </main>
  );
}
