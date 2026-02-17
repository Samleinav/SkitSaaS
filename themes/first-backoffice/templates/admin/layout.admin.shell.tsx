import type { ReactNode } from 'react';

type LayoutAdminShellData = {
  heading?: unknown;
  variant?: unknown;
  mode?: unknown;
  navSlot?: ReactNode;
  breadcrumbSlot?: ReactNode;
  controlsSlot?: ReactNode;
  contentSlot?: ReactNode;
};

type TemplateProps = {
  data?: LayoutAdminShellData;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

function toStringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function mergeClassNames(
  ...values: Array<string | false | null | undefined>
) {
  return values.filter(Boolean).join(' ');
}

export default function LayoutAdminShellTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const variant = toStringOrFallback(data?.variant, 'basic');
  const mode = toStringOrFallback(data?.mode, 'compact');
  const isAdjusted = mode === 'adjusted';
  const navSlot = data?.navSlot ?? null;
  const breadcrumbSlot = data?.breadcrumbSlot ?? null;
  const controlsSlot = data?.controlsSlot ?? null;
  const contentSlot = data?.contentSlot ?? null;
  const content = contentSlot ?? children;
  const hasComposableSlots = Boolean(
    navSlot || breadcrumbSlot || controlsSlot || contentSlot
  );

  if (!hasComposableSlots) {
    return (
      <section
        className={className || 'theme-first-backoffice-shell min-h-screen bg-background text-foreground'}
        data-theme-template="layout.admin.shell"
      >
        {children}
      </section>
    );
  }

  if (variant === 'pro') {
    return (
      <section
        className={mergeClassNames(
          'theme-first-backoffice-shell relative flex min-h-0 flex-1 overflow-hidden bg-slate-100/50 dark:bg-[#0b1222]',
          className
        )}
        data-theme-template="layout.admin.shell"
        data-shell-variant={variant}
        data-shell-mode={mode}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(59,130,246,0.13),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(56,189,248,0.14),transparent_38%)]" />
        <div className="relative flex w-full flex-1 flex-col xl:flex-row">
          <aside
            className={mergeClassNames(
              'w-full border-b border-slate-200/70 bg-slate-950/95 text-slate-100 xl:fixed xl:inset-y-0 xl:left-0 xl:z-50 xl:border-r xl:border-b-0 dark:border-slate-800/80',
              isAdjusted ? 'xl:w-[320px]' : 'xl:w-[292px]'
            )}
          >
            <div
              className={mergeClassNames(
                'flex h-full flex-col overflow-y-auto',
                isAdjusted ? 'gap-5 p-5' : 'gap-4 p-4'
              )}
            >
              {navSlot}
              {controlsSlot ? <div className="mt-auto">{controlsSlot}</div> : null}
            </div>
          </aside>
          <main
            className={mergeClassNames(
              'min-w-0 flex-1',
              isAdjusted
                ? 'px-4 py-6 sm:px-6 lg:px-10 lg:py-8 xl:pl-[344px]'
                : 'px-3 py-4 sm:px-5 lg:px-8 lg:py-6 xl:pl-[314px]'
            )}
          >
            <div
              className={mergeClassNames(
                'mx-auto w-full',
                isAdjusted ? 'max-w-[1440px]' : 'max-w-[1240px]'
              )}
            >
              {breadcrumbSlot}
              <div className={mergeClassNames('space-y-6', isAdjusted && 'space-y-8')}>
                {content}
              </div>
            </div>
          </main>
        </div>
      </section>
    );
  }

  return (
    <section
      className={mergeClassNames(
        'theme-first-backoffice-shell min-h-screen bg-background text-foreground',
        className
      )}
      data-theme-template="layout.admin.shell"
      data-shell-variant={variant}
      data-shell-mode={mode}
    >
      <section
        className={mergeClassNames(
          'mx-auto w-full flex-1',
          isAdjusted
            ? 'max-w-[94rem] px-5 py-7 sm:px-7 lg:px-8 lg:py-9'
            : 'max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8'
        )}
      >
        <div
          className={mergeClassNames(
            'grid',
            isAdjusted ? 'gap-8 xl:grid-cols-[320px_1fr]' : 'gap-6 xl:grid-cols-[300px_1fr]'
          )}
        >
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            {navSlot}
            {controlsSlot}
          </aside>
          <main className={mergeClassNames('min-w-0', isAdjusted ? 'space-y-8' : 'space-y-6')}>
            {breadcrumbSlot}
            {content}
          </main>
        </div>
      </section>
    </section>
  );
}
