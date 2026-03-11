'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Building2 } from 'lucide-react';

type LayoutPrivateHeaderData = {
  area?: 'admin' | 'dashboard';
  controlsSlot?: ReactNode;
  projectName?: string;
};

type LayoutPrivateHeaderTemplateProps = {
  data?: LayoutPrivateHeaderData;
  className?: string;
};

export default function LayoutPrivateHeaderTemplate({
  data,
  className
}: LayoutPrivateHeaderTemplateProps) {
  const projectName = data?.projectName?.trim() || 'S-Kit-SaaS';
  const areaLabel = data?.area === 'admin' ? 'ADMIN' : 'DASHBOARD';

  return (
    <header
      className={
        className ||
        'sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl'
      }
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" prefetch={false} className="group flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-orange-200/70 bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm transition-transform group-hover:-translate-y-0.5 dark:border-orange-400/40 dark:from-orange-400 dark:to-amber-300">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
              {areaLabel}
            </p>
            <span className="text-base font-semibold text-foreground">{projectName}</span>
          </div>
        </Link>

        {data?.controlsSlot ?? null}
      </div>
    </header>
  );
}
