'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import {
  mergeClassNames,
  toStringOrNull,
  useI18n
} from '@skitsaas/sdk';
import { NexusSidebarUser } from '../../components/nexus-sidebar-user';
import type {
  TemplateData as BaseTemplateData,
  TemplateProps
} from '../template-types';

type DashboardShellTemplateData = BaseTemplateData & {
  contentSlot?: ReactNode;
};

export default function LayoutDashboardShellTemplate({
  data,
  className,
  children,
  themeId
}: TemplateProps<DashboardShellTemplateData> & { themeId?: string }) {
  const content = data?.contentSlot ?? children;
  const mode = data?.mode === 'adjusted' ? 'adjusted' : 'compact';
  const projectName = data?.projectName?.trim() || 'S-Kit-SaaS';
  const sidebarWidthClass = mode === 'adjusted' ? 'xl:w-[17.25rem]' : 'xl:w-64';
  const t = useI18n({ themeId, area: 'dashboard' });

  return (
    <section
      className={mergeClassNames(
        'min-h-screen bg-background text-foreground',
        className
      )}
      data-nexus-dashboard-mode={mode}
      data-layout-style={toStringOrNull(data?.layoutStyle) ?? undefined}
      data-layout-mode={toStringOrNull(data?.mode) ?? undefined}
      data-layout-heading={toStringOrNull(data?.heading) ?? undefined}
      data-nexus-dashboard-shell="true"
    >
      <button
        type="button"
        aria-label={t('Close sidebar')}
        data-nexus-sidebar-backdrop
        tabIndex={-1}
        onClick={() => document.documentElement.removeAttribute('data-sidebar-mobile-open')}
        className="fixed inset-0 z-[59] hidden bg-black/50 xl:hidden"
      />

      <div
        data-nexus-dashboard-brand
        className={mergeClassNames(
          'fixed left-0 top-0 z-[60] hidden h-14 items-center border-r border-b border-border/70 bg-sidebar px-2.5 xl:flex',
          sidebarWidthClass
        )}
      >
        <Link
          href="/dashboard"
          prefetch={false}
          className="group inline-flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-sidebar-accent/60"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              {projectName}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">
              {t('Client Dashboard')}
            </p>
          </div>
        </Link>
      </div>

      <div data-nexus-dashboard-content className="relative">
        {content}
      </div>

      <div
        data-nexus-dashboard-user-panel
        className={mergeClassNames(
          'fixed bottom-0 left-0 z-[60] hidden border-r border-t border-border/70 bg-sidebar px-2.5 py-2 xl:block',
          sidebarWidthClass
        )}
      >
        <NexusSidebarUser area="dashboard" themeId={themeId} />
      </div>
    </section>
  );
}
