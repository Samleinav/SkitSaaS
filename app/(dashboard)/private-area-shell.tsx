'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeTemplate } from '@/components/ui/theme-template';

type PrivateAreaShellProps = {
  adminThemeId?: string | null;
  dashboardThemeId?: string | null;
  children?: ReactNode;
};

function resolvePrivateArea(pathname: string | null): 'admin' | 'dashboard' {
  return pathname?.startsWith('/admin') ? 'admin' : 'dashboard';
}

export function PrivateAreaShell({
  adminThemeId = null,
  dashboardThemeId = null,
  children
}: PrivateAreaShellProps) {
  const pathname = usePathname();
  const activeArea = resolvePrivateArea(pathname);
  const themeId = activeArea === 'admin' ? adminThemeId : dashboardThemeId;

  const fallbackShell = (
    <section className="flex min-h-screen flex-col bg-transparent">
      {children}
    </section>
  );

  return (
    <ThemeTemplate
      id="layout.private.shell"
      themeId={themeId}
      data={{
        area: activeArea,
        route: pathname
      }}
      fallback={fallbackShell}
    >
      {children}
    </ThemeTemplate>
  );
}
