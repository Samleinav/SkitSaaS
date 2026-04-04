import type { ReactNode } from 'react';
import {
  resolveFrontendThemeRoute,
  type FrontendThemeRouteResolution,
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
  const { rendered } = await resolveAndRenderFrontendThemeRoute({
    path,
    themeId,
    data,
    className,
    children,
    fallback
  });

  return <>{rendered}</>;
}

export async function resolveAndRenderFrontendThemeRoute<TData>({
  path,
  themeId,
  data,
  className,
  children,
  fallback,
  logMissing = true
}: {
  path: string;
  themeId: string | null | undefined;
  data?: TData;
  className?: string;
  children?: ReactNode;
  fallback?: ReactNode;
  logMissing?: boolean;
}): Promise<{
  rendered: ReactNode | null;
  resolved: FrontendThemeRouteResolution;
}> {
  const resolved = await resolveFrontendThemeRoute({
    themeId,
    path
  });

  if (!resolved.Component) {
    if (logMissing) {
      reportMissingThemeFrontendRoute({
        reason: resolved.reason,
        path: resolved.path,
        themeId: resolved.themeId
      });
    }

    return {
      rendered: fallback ?? null,
      resolved
    };
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
    return {
      rendered: <resolved.Provider>{renderedRoute}</resolved.Provider>,
      resolved
    };
  }

  return {
    rendered: renderedRoute,
    resolved
  };
}
