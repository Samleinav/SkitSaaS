'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type PrivateBreadcrumbProps = {
  rootHref: string;
  rootLabel: string;
  labels?: Record<string, string>;
  className?: string;
};

function formatSegment(segment: string) {
  const cleaned = decodeURIComponent(segment).replace(/[-_]+/g, ' ').trim();
  if (!cleaned) {
    return segment;
  }

  return cleaned
    .split(' ')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ');
}

export function PrivateBreadcrumb({
  rootHref,
  rootLabel,
  labels,
  className
}: PrivateBreadcrumbProps) {
  const pathname = usePathname();
  const rootSegment = rootHref.replace(/^\/+/, '').split('/')[0] || '';
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .filter((segment, index) => !(index === 0 && segment === rootSegment));

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex min-h-9 items-center rounded-xl border border-slate-200/75 bg-white/90 px-3 text-xs dark:border-slate-800/75 dark:bg-slate-950/65',
        className
      )}
    >
      <ol className="flex min-w-0 items-center gap-1.5">
        <li>
          <Link
            href={rootHref}
            className="font-medium text-slate-700 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100"
          >
            {rootLabel}
          </Link>
        </li>

        {segments.map((segment, index) => {
          const href = `${rootHref}/${segments.slice(0, index + 1).join('/')}`;
          const label = labels?.[segment] ?? formatSegment(segment);
          const isLast = index === segments.length - 1;

          return (
            <li key={href} className="flex min-w-0 items-center gap-1.5">
              <span className="text-slate-400 dark:text-slate-600">/</span>
              {isLast ? (
                <span className="truncate font-medium text-slate-500 dark:text-slate-400">
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="truncate text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
