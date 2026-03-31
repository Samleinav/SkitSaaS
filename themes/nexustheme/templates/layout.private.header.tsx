'use client';

import Link from 'next/link';
import * as React from 'react';
import type { ReactNode } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { mergeClassNames, useI18n } from '@skitsaas/sdk';
import { NexusThemeToggle } from '../components/nexus-theme-toggle';
import {
  HeaderSidebarToggle,
  PrivateHeaderSearchBlock,
  useCommandSearchHotkey
} from '../components/command-search';

type LayoutPrivateHeaderData = {
  area?: string;
  controlsSlot?: ReactNode;
  projectName?: string;
};

type LayoutPrivateHeaderTemplateProps = {
  data?: LayoutPrivateHeaderData;
  className?: string;
  themeId?: string;
};

export default function LayoutPrivateHeaderTemplate({
  data,
  className,
  themeId
}: LayoutPrivateHeaderTemplateProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const area = data?.area === 'dashboard' ? 'dashboard' : 'admin';
  const homeHref = area === 'dashboard' ? '/dashboard' : '/admin';
  const projectName = data?.projectName?.trim() || 'S-Kit-SaaS';
  const t = useI18n({ themeId, area });
  useCommandSearchHotkey(() => setSearchOpen((open) => !open));

  return (
    <header
      data-nexus-private-header
      className={mergeClassNames(
        'sticky top-0 z-50 flex h-14 items-center border-b border-border/70 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:px-4',
        className
      )}
    >
      {/* Logo: always on mobile, on desktop only when sidebar is collapsed (CSS-controlled) */}
      <Link
        href={homeHref}
        prefetch={false}
        data-nexus-header-logo
        className="xl:hidden inline-flex items-center gap-2 rounded-md px-1 py-1 mr-1 transition-colors hover:bg-accent/60"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LayoutDashboard className="h-3.5 w-3.5" />
        </span>
        <span className="hidden sm:inline truncate text-sm font-semibold">{projectName}</span>
      </Link>

      {/* Sidebar toggle — all sizes */}
      <HeaderSidebarToggle
        onClick={() => {
          const isDesktop = window.matchMedia('(min-width: 1280px)').matches;
          if (isDesktop) {
            document.documentElement.toggleAttribute('data-sidebar-collapsed');
          } else {
            document.documentElement.toggleAttribute('data-sidebar-mobile-open');
          }
        }}
      />

      <PrivateHeaderSearchBlock
        open={searchOpen}
        onOpenChange={setSearchOpen}
        label={t('Search...')}
      />

      {/* Theme toggle + controls slot */}
      <div className="ml-auto flex items-center gap-1.5">
        <NexusThemeToggle />
        {data?.controlsSlot ?? null}
      </div>
    </header>
  );
}
