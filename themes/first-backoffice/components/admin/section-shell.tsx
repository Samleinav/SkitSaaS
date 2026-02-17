import type { ReactNode } from 'react';

type AdminSectionShellProps = {
  templateId: string;
  className?: string;
  children?: ReactNode;
};

export function AdminSectionShell({
  templateId,
  className,
  children
}: AdminSectionShellProps) {
  return (
    <section className={className} data-theme-template={templateId}>
      {children}
    </section>
  );
}
