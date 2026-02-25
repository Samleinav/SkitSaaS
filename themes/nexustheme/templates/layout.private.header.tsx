'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { LayoutDashboard, Search } from 'lucide-react';
import { mergeClassNames } from '@skitsaas/sdk';

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
      className={mergeClassNames(
        'sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90',
        className
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-3 sm:px-4 lg:px-6">
        <Link
          href="/"
          prefetch={false}
          className="group inline-flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-accent/60"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="h-4 w-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">SkitSaaS</p>
            <p className="truncate text-[11px] text-muted-foreground">Admin Dashboard</p>
          </div>
        </Link>

        <div className="hidden flex-1 md:flex">
          <button
            type="button"
            className="inline-flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 text-left text-xs text-muted-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <span className="ml-auto rounded border border-border/80 px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
              Ctrl K
            </span>
          </button>
        </div>

        {data?.controlsSlot ?? null}
      </div>
    </header>
  );
}
