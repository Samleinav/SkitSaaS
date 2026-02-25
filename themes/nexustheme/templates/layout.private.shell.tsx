'use client';

import type { ReactNode } from 'react';
import { mergeClassNames } from '@skitsaas/sdk';

type LayoutPrivateShellTemplateProps = {
  className?: string;
  children?: ReactNode;
};

export default function LayoutPrivateShellTemplate({
  className,
  children
}: LayoutPrivateShellTemplateProps) {
  return (
    <section
      className={mergeClassNames(
        'flex min-h-screen flex-col bg-background text-foreground',
        className
      )}
      data-nexus-private-shell="true"
    >
      {children}
    </section>
  );
}
