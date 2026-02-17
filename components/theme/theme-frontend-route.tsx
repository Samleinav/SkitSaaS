import type { ReactNode } from 'react';
import {
  resolveFrontendThemeRoute,
  type FrontendThemeRouteResolveFailureReason
} from '@/lib/themes/frontend-routes';

function reportMissingThemeFrontendRoute({
  reason,
  path,
  themeId
}: {
  reason: FrontendThemeRouteResolveFailureReason | null;
  path: string;
  themeId: string | null;
}) {
  if (process.env.NODE_ENV !== 'development' || !reason) {
    return;
  }

  console.error(
    `[theme-frontend-route] route_not_found` +
      ` reason="${reason}"` +
      ` path="${path}"` +
      ` themeId="${themeId ?? 'none'}"`
  );
}

export async function ThemeFrontendRoute<TData>({
  path,
  themeId,
  data,
  className,
  children,
  fallback
}: {
  path: string;
  themeId: string | null | undefined;
  data?: TData;
  className?: string;
  children?: ReactNode;
  fallback: ReactNode;
}) {
  const resolved = await resolveFrontendThemeRoute({
    themeId,
    path
  });

  if (!resolved.Component) {
    reportMissingThemeFrontendRoute({
      reason: resolved.reason,
      path: resolved.path,
      themeId: resolved.themeId
    });
    return <>{fallback}</>;
  }

  const renderedRoute = (
    <resolved.Component
      data={data}
      className={className}
      themeId={resolved.themeId ?? undefined}
    >
      {children}
    </resolved.Component>
  );

  if (resolved.Provider) {
    return <resolved.Provider>{renderedRoute}</resolved.Provider>;
  }

  return renderedRoute;
}
