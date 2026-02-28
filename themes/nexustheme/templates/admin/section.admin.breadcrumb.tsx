'use client';

import { usePathname } from 'next/navigation';
import { toStringOrFallback } from '@skitsaas/sdk';
import { mergeClassNames } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

function formatSegment(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SectionAdminBreadcrumbTemplate({
  data,
  className
}: TemplateProps) {
  const pathname = usePathname();
  const rootLabel = toStringOrFallback(data?.title, 'Admin');

  // Build segments after /admin
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .filter((seg, idx) => !(idx === 0 && seg === 'admin'));

  return (
    <div
      className={mergeClassNames('mb-3 px-0.5', className)}
      data-nexus-admin-breadcrumb="minimal"
    >
      <span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {rootLabel}
      </span>
      {segments.map((seg, idx) => (
        <span key={idx} className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {' / '}
          <span className={idx === segments.length - 1 ? 'text-foreground/80' : ''}>
            {formatSegment(seg)}
          </span>
        </span>
      ))}
    </div>
  );
}
