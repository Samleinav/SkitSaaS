'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@skitsaas/sdk';
import { BookOpen, CreditCard, Gem, Menu, Sparkles, X } from 'lucide-react';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

const MOBILE_NAV_ITEMS = [
  {
    href: '/#features',
    labelKey: 'Features',
    icon: Sparkles
  },
  {
    href: '/pricing',
    labelKey: 'Pricing',
    icon: CreditCard
  },
  {
    href: '/docs',
    labelKey: 'Docs',
    icon: BookOpen
  }
] as const;

export default function LayoutFrontendShellTemplate({
  className,
  themeId,
  children
}: TemplateProps) {
  const pathname = usePathname();
  const t = useI18n({ themeId, area: 'frontend' });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <section
      className={className || 'theme-first-frontend-root min-h-screen text-foreground'}
      data-theme-template="layout.frontend.shell"
    >
      <div className="fixed right-4 bottom-4 z-50 md:hidden">
        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-amber-200/20 bg-[#090909]/90 text-amber-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:border-amber-100/40 hover:bg-black"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMobileMenuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 md:hidden">
            <div className="theme-first-frontend-panel overflow-hidden rounded-[2rem] border border-amber-200/20 bg-[linear-gradient(180deg,rgba(12,12,12,0.97)_0%,rgba(7,7,7,0.98)_100%)] shadow-[0_-20px_80px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <Link
                  href="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200/20 bg-amber-200/10 text-amber-100">
                    <Gem className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] tracking-[0.24em] text-zinc-500 uppercase">
                      S-kit SaaS
                    </span>
                    <span className="block font-[family-name:var(--font-marketing-serif)] text-lg font-medium text-zinc-100">
                      Starter
                    </span>
                  </span>
                </Link>

                <button
                  type="button"
                  aria-label="Close navigation"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-amber-200/20 hover:bg-amber-200/10 hover:text-amber-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 p-4">
                {MOBILE_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/#features'
                      ? pathname === '/'
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`group flex items-center gap-3 rounded-2xl border px-4 py-4 transition ${
                        isActive
                          ? 'border-amber-200/30 bg-amber-200/10 text-amber-100'
                          : 'border-white/10 bg-white/5 text-zinc-100 hover:border-amber-200/20 hover:bg-amber-200/10 hover:text-amber-100'
                      }`}
                    >
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${
                          isActive
                            ? 'border-amber-200/30 bg-amber-200/10 text-amber-100'
                            : 'border-white/10 bg-black/30 text-zinc-400 group-hover:border-amber-200/20 group-hover:text-amber-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="flex-1">
                        <span className="block text-sm font-medium">
                          {t(item.labelKey)}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {children}
    </section>
  );
}
