'use client';

import type { ReactNode } from 'react';

type LayoutPrivateShellTemplateProps = {
  className?: string;
  children?: ReactNode;
};

export default function LayoutPrivateShellTemplate({
  className,
  children
}: LayoutPrivateShellTemplateProps) {
  return (
    <section className={className || 'flex min-h-screen flex-col bg-transparent'}>
      {children}
    </section>
  );
}