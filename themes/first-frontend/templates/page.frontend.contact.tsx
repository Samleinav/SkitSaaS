'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@skitsaas/sdk';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

const CONTACT_HIGHLIGHTS = [
  'Functional form',
  'Messages are stored',
  'Visible in admin'
] as const;

export default function PageFrontendContactTemplate({
  className,
  children,
  themeId
}: TemplateProps) {
  const t = useI18n({ themeId, area: 'frontend' });

  return (
    <main
      className={
        className || 'relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8'
      }
      data-theme-template="page.frontend.contact"
    >
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <article className="theme-first-frontend-panel overflow-hidden rounded-[2rem] p-8 sm:p-10">
          <span className="inline-flex items-center rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-1 text-[11px] font-medium tracking-[0.2em] text-amber-100 uppercase">
            {t('Public support')}
          </span>

          <div className="mt-6 space-y-4">
            <h1 className="font-[family-name:var(--font-marketing-serif)] text-5xl font-medium leading-[1.04] text-zinc-100 sm:text-6xl">
              {t('Contact us')}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              {t(
                'The form below is already connected to the contact module and saves messages for the admin inbox.'
              )}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {CONTACT_HIGHLIGHTS.map((labelKey) => (
              <span
                key={labelKey}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-medium tracking-[0.16em] text-zinc-200 uppercase"
              >
                {t(labelKey)}
              </span>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-amber-200/15 bg-black/20 p-5">
            <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
              {t('Admin inbox')}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              {t('Use this page to prove the public contact flow is wired end to end.')}
            </p>
            <code className="mt-4 inline-flex rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs text-amber-100">
              /admin/custom/contact
            </code>
          </div>

          <p className="mt-6 text-sm text-zinc-500">
            {t('We reply by email, so send the best address for your team.')}
          </p>
        </article>

        <section className="theme-first-frontend-panel rounded-[2rem] border border-amber-200/15 p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
                {t('Module slot')}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-100">
                {t('Send your message')}
              </h2>
            </div>
          </div>

          <div>{children}</div>
        </section>
      </section>
    </main>
  );
}
