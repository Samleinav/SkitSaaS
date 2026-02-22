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
  const variant = data?.variant === 'pro' ? 'pro' : 'basic';
  const mode = data?.mode === 'adjusted' ? 'adjusted' : 'compact';
  const navSlot = data?.navSlot ?? null;
  const breadcrumbSlot = data?.breadcrumbSlot ?? null;
  const controlsSlot = data?.controlsSlot ?? null;
  const contentSlot = data?.contentSlot ?? null;
  const content = contentSlot ?? children;
  const hasComposableSlots = Boolean(
    navSlot || breadcrumbSlot || controlsSlot || contentSlot
  );
  const sidebarWidth = mode === 'adjusted' ? 'xl:w-[272px]' : 'xl:w-[252px]';
  const contentInset = mode === 'adjusted' ? 'xl:pl-[272px]' : 'xl:pl-[252px]';
  const isPro = variant === 'pro';

  if (!hasComposableSlots) {
    return (
      <section className={className || 'min-h-screen bg-background text-foreground'}>
        {children}
      </section>
    );
  }

  return (
    <section
      className={mergeClassNames('min-h-screen bg-background text-foreground', className)}
      data-shell-variant={variant}
      data-shell-mode={mode}
    >
      <aside
        className={mergeClassNames(
          'border-b border-border/70 bg-background/95 backdrop-blur-md xl:fixed xl:inset-y-0 xl:left-0 xl:z-40 xl:border-r xl:border-b-0',
          isPro ? 'xl:bg-black/85' : 'xl:bg-background/90',
          sidebarWidth
        )}
      >
        <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col px-3 py-3 xl:min-h-screen xl:px-2.5 xl:py-3">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">{navSlot}</div>
          {controlsSlot ? (
            <div className="mt-3 border-t border-border/60 pt-3">
              {controlsSlot}
            </div>
          ) : null}
        </div>
      </aside>

      <main className={mergeClassNames('min-w-0 px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5', contentInset)}>
        {breadcrumbSlot ? <div className="mb-3">{breadcrumbSlot}</div> : null}
        <section className="w-full">{content}</section>
      </main>
    </section>
  );
}


