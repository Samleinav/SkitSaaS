'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { LayoutDashboard, PanelLeft, Search } from 'lucide-react';
import { mergeClassNames } from '@skitsaas/sdk';
import { NexusThemeToggle } from '../components/nexus-theme-toggle';

type LayoutPrivateHeaderData = {
  controlsSlot?: ReactNode;
};

type LayoutPrivateHeaderTemplateProps = {
  data?: LayoutPrivateHeaderData;
  className?: string;
};

export default function LayoutPrivateHeaderTemplate({
  data,
  className
}: LayoutPrivateHeaderTemplateProps) {
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
        href="/"
        prefetch={false}
        data-nexus-header-logo
        className="xl:hidden inline-flex items-center gap-2 rounded-md px-1 py-1 mr-1 transition-colors hover:bg-accent/60"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LayoutDashboard className="h-3.5 w-3.5" />
        </span>
        <span className="hidden sm:inline truncate text-sm font-semibold">SkitSaaS</span>
      </Link>

      {/* Sidebar toggle — all sizes */}
      <button
        type="button"
        aria-label="Toggle sidebar"
        onClick={() => {
          const isDesktop = window.matchMedia('(min-width: 1280px)').matches;
          if (isDesktop) {
            document.documentElement.toggleAttribute('data-sidebar-collapsed');
          } else {
            document.documentElement.toggleAttribute('data-sidebar-mobile-open');
          }
        }}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      {/* Search — desktop */}
      <div className="hidden flex-1 md:flex md:mx-3">
        <button
          type="button"
          className="inline-flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span>Search...</span>
          <span className="ml-auto rounded border border-border/80 px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
            Ctrl K
          </span>
        </button>
      </div>

      {/* Search icon — mobile */}
      <button
        type="button"
        aria-label="Search"
        className="md:hidden ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Theme toggle + controls slot */}
      <div className="ml-auto flex items-center gap-1.5">
        <NexusThemeToggle />
        {data?.controlsSlot ?? null}
      </div>
    </header>
  );
}
