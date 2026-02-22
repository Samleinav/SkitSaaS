import type { ReactNode } from 'react';
import { toStringOrNull } from '@skitsaas/sdk';
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
  children
}: TemplateProps<DashboardShellTemplateData>) {
  const content = data?.contentSlot ?? children;

  return (
    <section
      className={className || 'theme-nexus-shell min-h-screen bg-background text-foreground'}
      data-layout-style={toStringOrNull(data?.layoutStyle) ?? undefined}
      data-layout-mode={toStringOrNull(data?.mode) ?? undefined}
      data-layout-heading={toStringOrNull(data?.heading) ?? undefined}
    >
      {content}
    </section>
  );
}

