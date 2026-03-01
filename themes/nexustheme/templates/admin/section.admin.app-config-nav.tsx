import { mergeClassNames, toStringOrFallback } from '@skitsaas/sdk';
import type { TemplateProps } from '../template-types';

export default function SectionAdminAppConfigNavTemplate({
  data,
  className,
  children
}: TemplateProps) {
  const section = toStringOrFallback(data?.section, 'app-config');

  return (
    <div
      className={mergeClassNames(
        'space-y-3',
        className
      )}
      data-admin-section={section}
    >
      {children}
    </div>
  );
}
