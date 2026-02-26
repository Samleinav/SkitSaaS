import type { ReactNode } from 'react';
import { mergeClassNames } from '@skitsaas/sdk';
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
  const navWidth = mode === 'adjusted' ? 'xl:w-[17rem]' : 'xl:w-[16rem]';
  const contentInset = mode === 'adjusted' ? 'xl:pl-[18.25rem]' : 'xl:pl-[17.25rem]';

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
      <aside
        className={mergeClassNames(
          'border-b border-border/70 bg-sidebar/90 px-3 py-3 xl:fixed xl:inset-y-[3.5rem] xl:left-0 xl:z-40 xl:border-r xl:border-b-0 xl:px-2.5 xl:pt-3 xl:pb-0',
          navWidth
        )}
      >
        <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col gap-2 xl:min-h-0">
          <div className="min-h-0 flex-1 overflow-hidden">{navSlot}</div>
          {controlsSlot ? (
            <div className="rounded-xl border border-sidebar-border bg-sidebar p-2 shadow-sm">
              {controlsSlot}
            </div>
          ) : null}
        </div>
      </aside>

      <main
        className={mergeClassNames(
          'min-w-0 px-3 pb-6 pt-2 sm:px-4 lg:px-6',
          contentInset
        )}
      >
        <div className="mx-auto w-full max-w-[1600px]">
          {breadcrumbSlot}
          <section className="space-y-3">{content}</section>
        </div>
      </main>
    </section>
  );
}
