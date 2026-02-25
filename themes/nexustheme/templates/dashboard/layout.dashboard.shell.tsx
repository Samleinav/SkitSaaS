import type { ReactNode } from 'react';
import { mergeClassNames, toStringOrNull } from '@skitsaas/sdk';
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
      className={mergeClassNames(
        'min-h-screen bg-background text-foreground',
        className
      )}
      data-layout-style={toStringOrNull(data?.layoutStyle) ?? undefined}
      data-layout-mode={toStringOrNull(data?.mode) ?? undefined}
      data-layout-heading={toStringOrNull(data?.heading) ?? undefined}
      data-nexus-dashboard-shell="true"
    >
      {content}
    </section>
  );
}


