'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { mergeClassNames } from '@skitsaas/sdk';
import { NexusSidebarUser } from '../../components/nexus-sidebar-user';
import type {
  TemplateData as BaseTemplateData,
  TemplateProps
} from '../template-types';

type AdminShellTemplateData = BaseTemplateData & {
  variant?: 'basic' | 'pro';
  mode?: 'compact' | 'adjusted';
  navSlot?: ReactNode;
  breadcrumbSlot?: ReactNode;
  controlsSlot?: ReactNode;
  contentSlot?: ReactNode;
};

export default function LayoutAdminShellTemplate({
  data,
  className,
  children
}: TemplateProps<AdminShellTemplateData>) {
  const mode = data?.mode === 'adjusted' ? 'adjusted' : 'compact';
  const navSlot = data?.navSlot ?? null;
  const breadcrumbSlot = data?.breadcrumbSlot ?? null;
  const controlsSlot = data?.controlsSlot ?? null;
  const contentSlot = data?.contentSlot ?? null;
  const content = contentSlot ?? children;
  const hasComposableSlots = Boolean(
    navSlot || breadcrumbSlot || controlsSlot || contentSlot
  );
  const navWidth = mode === 'adjusted' ? 'xl:w-[17.25rem]' : 'xl:w-64';

  if (!hasComposableSlots) {
    return (
      <section className={className || 'min-h-screen bg-background text-foreground'}>
        {children}
      </section>
    );
  }

  return (
    <section
      className={mergeClassNames(
        'min-h-screen bg-background text-foreground',
        className
      )}
      data-nexus-admin-shell={mode}
    >
      {/* ── Mobile backdrop — closes sidebar when tapped ─────────── */}
      <button
        type="button"
        aria-label="Close sidebar"
        data-nexus-sidebar-backdrop
        tabIndex={-1}
        onClick={() => document.documentElement.removeAttribute('data-sidebar-mobile-open')}
        className="fixed inset-0 z-[59] hidden bg-black/50 xl:hidden"
      />

      {/* ── Sidebar drawer — fixed on all screen sizes ───────────── */}
      <aside
        className={mergeClassNames(
          // Base: fixed full-height drawer, always in the same place
          'fixed inset-y-0 left-0 z-[60] flex flex-col',
          'bg-sidebar border-r border-border/70',
          // Mobile width slightly wider for touch comfort
          'w-72',
          // Desktop width
          navWidth
        )}
      >
        {/* Branding header — height matches top nav bar (h-14) */}
        <div className="flex h-14 shrink-0 items-center border-b border-border/70 px-2.5">
          <Link
            href="/"
            prefetch={false}
            className="group inline-flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-sidebar-accent/60"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">SkitSaaS</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">Admin Dashboard</p>
            </div>
          </Link>
        </div>

        {/* Nav content — scrollable */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pt-3 pb-2">
          <div className="min-h-0 flex-1">{navSlot}</div>
        </div>

        {/* User section — pinned to bottom */}
        <div className="shrink-0 border-t border-border/70 px-2.5 py-2">
          <NexusSidebarUser />
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="min-h-screen px-3 pb-6 pt-5 sm:px-4 lg:px-6">
        <div className="mx-auto w-full max-w-[1600px]">
          {breadcrumbSlot}
          <section className="mt-3 space-y-3">{content}</section>
        </div>
      </main>
    </section>
  );
}
